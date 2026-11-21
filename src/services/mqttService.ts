import mqtt, { MqttClient } from 'mqtt';
import {
  MqttOutputs,
  ExtensionOutputs,
  MqttOutputState,
  OutputSource,
  HomeConnectionStatus,
  RequestStatus,
  DiagnosticLogEntry,
  MqttCommand,
  JsonCommandRequest,
  JsonCommandResponse,
  LastCommandOutcome,
} from '../types';

export const BROKER_CONFIG = {
  host: 'z9befe1c.ala.asia-southeast1.emqxsl.com',
  port: 8084,
  path: '/mqtt',
  url: 'wss://z9befe1c.ala.asia-southeast1.emqxsl.com:8084/mqtt',
  topics: {
    cmd: 'farm/home01/cmd',
    reply: 'farm/home01/reply',
    connection: 'farm/home01/connection',
  },
  timeoutMs: 8000, // 8-second local UI timeout
  commandTtlMs: 10000, // 10-second TTL (<= 15000 ms limit)
};

const INITIAL_OUTPUTS: MqttOutputs = {
  DO1: { state: 'UNKNOWN', source: 'NONE' },
  DO2: { state: 'UNKNOWN', source: 'NONE' },
  DO3: { state: 'UNKNOWN', source: 'NONE' },
  DO4: { state: 'UNKNOWN', source: 'NONE' },
  DO5: { state: 'UNKNOWN', source: 'NONE' },
  DO6: { state: 'UNKNOWN', source: 'NONE' },
  DO7: { state: 'UNKNOWN', source: 'NONE' },
  DO8: { state: 'UNKNOWN', source: 'NONE' },
};

const INITIAL_EXTENSIONS: ExtensionOutputs = {
  V9: { state: 'UNKNOWN', source: 'NONE' },
  V10: { state: 'UNKNOWN', source: 'NONE' },
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface MqttServiceListener {
  onConnectionChange: (connected: boolean, connecting: boolean) => void;
  onReplySubscribedChange: (subscribed: boolean) => void;
  onHomeStatusChange: (status: HomeConnectionStatus) => void;
  onOutputsChange: (
    outputs: MqttOutputs,
    extensions: ExtensionOutputs,
    isStale: boolean,
    lastValidTime: number | null
  ) => void;
  onRequestStatusChange: (status: RequestStatus, pendingCommand?: MqttCommand) => void;
  onRequiresStatusRefreshChange: (required: boolean) => void;
  onLastCommandOutcome: (outcome: LastCommandOutcome) => void;
  onDiagnostic: (entry: DiagnosticLogEntry) => void;
}

class MqttService {
  private client: MqttClient | null = null;
  private listeners: Set<MqttServiceListener> = new Set();

  private isConnected = false;
  private isConnecting = false;
  private replySubscribed = false;
  private homeStatus: HomeConnectionStatus = 'unknown';

  private outputs: MqttOutputs = JSON.parse(JSON.stringify(INITIAL_OUTPUTS));
  private extensions: ExtensionOutputs = JSON.parse(JSON.stringify(INITIAL_EXTENSIONS));
  private isStale = false;
  private lastValidReplyTime: number | null = null;

  // Transaction tracking: exactly ONE pending request across STATUS & actuator commands
  private activePendingRequest: JsonCommandRequest | null = null;
  private requestStatus: RequestStatus = 'idle';
  private requestTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  // Startup and uncertain actuator results require successful STATUS before another actuator command
  private requiresStatusRefresh = true;
  private lastOutcome: LastCommandOutcome | null = null;

  public subscribeListener(listener: MqttServiceListener): () => void {
    this.listeners.add(listener);
    // Push current states immediately
    listener.onConnectionChange(this.isConnected, this.isConnecting);
    listener.onReplySubscribedChange(this.replySubscribed);
    listener.onHomeStatusChange(this.homeStatus);
    listener.onOutputsChange(this.outputs, this.extensions, this.isStale, this.lastValidReplyTime);
    listener.onRequestStatusChange(this.requestStatus, this.activePendingRequest?.command);
    listener.onRequiresStatusRefreshChange(this.requiresStatusRefresh);
    if (this.lastOutcome) {
      listener.onLastCommandOutcome(this.lastOutcome);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  private addDiagnostic(type: DiagnosticLogEntry['type'], message: string) {
    const entry: DiagnosticLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      type,
      message,
    };
    this.listeners.forEach((l) => l.onDiagnostic(entry));
  }

  public connect(username: string, password: string) {
    if (this.client || this.isConnecting || this.isConnected) {
      return;
    }

    this.isConnecting = true;
    this.listeners.forEach((l) => l.onConnectionChange(false, true));
    this.addDiagnostic('info', 'Connecting to EMQX Cloud broker over WSS (clean session)...');

    const clientId = `sinchai_app_${Math.random().toString(36).substring(2, 10)}`;

    try {
      this.client = mqtt.connect(BROKER_CONFIG.url, {
        clientId,
        username,
        password,
        clean: true,
        queueQoSZero: false, // Never queue QoS 0 offline
        reconnectPeriod: 0,  // Never automatically replay commands after reconnect
        connectTimeout: 10000,
        keepalive: 60,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.isConnecting = false;
        // Require STATUS refresh on initial startup
        this.requiresStatusRefresh = true;
        this.listeners.forEach((l) => {
          l.onConnectionChange(true, false);
          l.onRequiresStatusRefreshChange(this.requiresStatusRefresh);
        });
        this.addDiagnostic('info', `Broker connected. Client ID: ${clientId}`);
        this.subscribeTopics();
      });

      this.client.on('message', (topic, payload) => {
        const text = payload.toString().trim();
        this.handleIncomingMessage(topic, text);
      });

      this.client.on('error', (err) => {
        this.isConnecting = false;
        this.addDiagnostic('error', `MQTT Error: ${err.message || 'Connection failure'}`);
        this.listeners.forEach((l) => l.onConnectionChange(this.isConnected, false));
      });

      this.client.on('close', () => {
        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.isConnecting = false;
        this.replySubscribed = false;
        this.clearPendingTimeout();
        this.activePendingRequest = null;
        this.requestStatus = 'idle';

        this.listeners.forEach((l) => {
          l.onConnectionChange(false, false);
          l.onReplySubscribedChange(false);
          l.onRequestStatusChange(this.requestStatus);
        });
        if (wasConnected) {
          this.addDiagnostic('warn', 'Broker connection closed.');
        }
      });
    } catch (err: any) {
      this.isConnecting = false;
      this.listeners.forEach((l) => l.onConnectionChange(false, false));
      this.addDiagnostic('error', `Connect exception: ${err?.message || 'Unknown'}`);
    }
  }

  private subscribeTopics() {
    if (!this.client || !this.isConnected) return;

    this.client.subscribe(BROKER_CONFIG.topics.reply, { qos: 0 }, (err) => {
      if (err) {
        this.addDiagnostic('error', `Failed to subscribe to reply topic: ${err.message}`);
        this.replySubscribed = false;
      } else {
        this.replySubscribed = true;
        this.addDiagnostic('info', `Subscribed to ${BROKER_CONFIG.topics.reply}`);
      }
      this.listeners.forEach((l) => l.onReplySubscribedChange(this.replySubscribed));
    });

    this.client.subscribe(BROKER_CONFIG.topics.connection, { qos: 0 }, (err) => {
      if (err) {
        this.addDiagnostic('error', `Failed to subscribe to connection topic: ${err.message}`);
      } else {
        this.addDiagnostic('info', `Subscribed to ${BROKER_CONFIG.topics.connection}`);
      }
    });
  }

  /**
   * Main message dispatcher
   */
  private handleIncomingMessage(topic: string, rawText: string) {
    if (topic === BROKER_CONFIG.topics.connection) {
      const lower = rawText.toLowerCase();
      if (lower.includes('online')) {
        this.homeStatus = 'online';
      } else if (lower.includes('offline')) {
        this.homeStatus = 'offline';
      } else {
        this.homeStatus = 'unknown';
      }
      this.addDiagnostic('rx', `[Home Announcement] ${rawText}`);
      this.listeners.forEach((l) => l.onHomeStatusChange(this.homeStatus));
      return;
    }

    if (topic !== BROKER_CONFIG.topics.reply) {
      return;
    }

    this.addDiagnostic('rx', `[Reply] ${rawText}`);

    // Try parsing as JSON command response first
    if (rawText.startsWith('{') && rawText.endsWith('}')) {
      try {
        const jsonResponse = JSON.parse(rawText) as JsonCommandResponse;
        if (jsonResponse.type === 'command_result') {
          this.handleJsonCommandResult(jsonResponse);
          return;
        }
      } catch {
        // Fall back to raw text parsing
      }
    }

    // Raw STATUS reply parsing (e.g. STATUS,MAIN,DO1=OFF,...)
    if (rawText.startsWith('STATUS,MAIN')) {
      this.handleRawStatusReply(rawText);
      return;
    }

    // Other legacy or plain text diagnostic replies
    if (this.activePendingRequest) {
      const pendingCmd = this.activePendingRequest.command;
      this.clearPendingTimeout();
      this.activePendingRequest = null;
      this.requestStatus = 'error';

      const outcome: LastCommandOutcome = {
        command: pendingCmd,
        result: 'raw_diagnostic',
        detail: rawText,
        timestamp: Date.now(),
        id: '',
      };
      this.lastOutcome = outcome;

      if (rawText.startsWith('TIMEOUT')) {
        this.requestStatus = 'timeout';
        this.isStale = true;
        this.requiresStatusRefresh = true;
      }

      this.listeners.forEach((l) => {
        l.onRequestStatusChange(this.requestStatus);
        l.onRequiresStatusRefreshChange(this.requiresStatusRefresh);
        l.onLastCommandOutcome(outcome);
      });
    }
  }

  /**
   * Handles structured JSON command_result response
   */
  private handleJsonCommandResult(response: JsonCommandResponse) {
    const { id, command, result, detail = '' } = response;

    // Check if ID matches current pending request
    const isMatchingId =
      this.activePendingRequest &&
      id &&
      id.trim() !== '' &&
      id === this.activePendingRequest.id;

    if (!isMatchingId) {
      // Unsolicited or unmatched message: log without completing another request
      this.addDiagnostic(
        'warn',
        `Unmatched/Unsolicited JSON: id="${id || 'empty'}", cmd="${command}", result="${result}"`
      );
      return;
    }

    const currentReq = this.activePendingRequest!;
    this.clearPendingTimeout();
    this.activePendingRequest = null;

    const outcome: LastCommandOutcome = {
      command: currentReq.command,
      result: result,
      detail: detail,
      timestamp: Date.now(),
      id: currentReq.id,
    };
    this.lastOutcome = outcome;

    switch (result) {
      case 'acknowledged': {
        this.requestStatus = 'received';
        this.applyAcknowledgedEffect(currentReq.command);
        break;
      }

      case 'status_received': {
        this.requestStatus = 'received';
        this.isStale = false;
        this.lastValidReplyTime = Date.now();
        this.requiresStatusRefresh = false;

        // Detail may contain the raw status string
        if (detail && detail.includes('STATUS,MAIN')) {
          this.parseAndApplyRawStatus(detail);
        }

        this.listeners.forEach((l) => {
          l.onRequiresStatusRefreshChange(this.requiresStatusRefresh);
          l.onOutputsChange(this.outputs, this.extensions, this.isStale, this.lastValidReplyTime);
        });
        break;
      }

      case 'partial':
      case 'controller_error':
      case 'unconfirmed': {
        // Mark affected output information uncertain. Do not assume no effect.
        this.requestStatus = 'error';
        this.requiresStatusRefresh = true;
        this.markCommandOutputsUncertain(currentReq.command);

        this.listeners.forEach((l) => {
          l.onRequiresStatusRefreshChange(this.requiresStatusRefresh);
          l.onOutputsChange(this.outputs, this.extensions, this.isStale, this.lastValidReplyTime);
        });
        break;
      }

      case 'rejected':
      case 'duplicate':
      case 'busy':
      default: {
        this.requestStatus = 'error';
        break;
      }
    }

    this.listeners.forEach((l) => {
      l.onRequestStatusChange(this.requestStatus);
      l.onLastCommandOutcome(outcome);
    });
  }

  /**
   * Raw STATUS string parser (e.g. STATUS,MAIN,DO1=OFF...)
   */
  private handleRawStatusReply(rawText: string) {
    const success = this.parseAndApplyRawStatus(rawText);
    if (success) {
      this.isStale = false;
      this.lastValidReplyTime = Date.now();
      this.requiresStatusRefresh = false;

      if (this.activePendingRequest && this.activePendingRequest.command === 'STATUS') {
        this.clearPendingTimeout();
        this.activePendingRequest = null;
        this.requestStatus = 'received';
      }

      this.listeners.forEach((l) => {
        l.onRequestStatusChange(this.requestStatus);
        l.onRequiresStatusRefreshChange(this.requiresStatusRefresh);
        l.onOutputsChange(this.outputs, this.extensions, this.isStale, this.lastValidReplyTime);
      });
    }
  }

  private parseAndApplyRawStatus(text: string): boolean {
    const tokens = text.split(',');
    const newOutputs: Partial<Record<keyof MqttOutputs, MqttOutputState>> = {};

    for (let i = 1; i < tokens.length; i++) {
      const match = tokens[i].trim().match(/^(DO[1-8])=(ON|OFF)$/);
      if (match) {
        newOutputs[match[1] as keyof MqttOutputs] = match[2] as MqttOutputState;
      }
    }

    const requiredKeys: (keyof MqttOutputs)[] = [
      'DO1', 'DO2', 'DO3', 'DO4', 'DO5', 'DO6', 'DO7', 'DO8'
    ];
    const allValid = requiredKeys.every((k) => newOutputs[k] === 'ON' || newOutputs[k] === 'OFF');

    if (allValid) {
      for (const k of requiredKeys) {
        this.outputs[k] = {
          state: newOutputs[k]!,
          source: 'STATUS',
        };
      }
      return true;
    }
    return false;
  }

  /**
   * On acknowledged: label resulting values as ACK-based until STATUS refresh.
   */
  private applyAcknowledgedEffect(cmd: MqttCommand) {
    if (cmd.startsWith('DO')) {
      const match = cmd.match(/^(DO[1-8])_(ON|OFF)$/);
      if (match) {
        const key = match[1] as keyof MqttOutputs;
        const state = match[2] as MqttOutputState;
        this.outputs[key] = { state, source: 'ACK' };
      }
    } else if (cmd.startsWith('V9_')) {
      const state = cmd === 'V9_ON' ? 'ON' : 'OFF';
      this.extensions.V9 = { state, source: 'ACK' };
    } else if (cmd.startsWith('V10_')) {
      const state = cmd === 'V10_ON' ? 'ON' : 'OFF';
      this.extensions.V10 = { state, source: 'ACK' };
    } else if (cmd === 'ALL_ON' || cmd === 'ALL_OFF') {
      const state: MqttOutputState = cmd === 'ALL_ON' ? 'ON' : 'OFF';
      (Object.keys(this.outputs) as (keyof MqttOutputs)[]).forEach((k) => {
        this.outputs[k] = { state, source: 'ACK' };
      });
      this.extensions.V9 = { state, source: 'ACK' };
      this.extensions.V10 = { state, source: 'ACK' };
    }

    this.listeners.forEach((l) =>
      l.onOutputsChange(this.outputs, this.extensions, this.isStale, this.lastValidReplyTime)
    );
  }

  /**
   * On partial / controller_error / unconfirmed: mark affected output uncertain.
   */
  private markCommandOutputsUncertain(cmd: MqttCommand) {
    if (cmd.startsWith('DO')) {
      const match = cmd.match(/^(DO[1-8])_/);
      if (match) {
        const key = match[1] as keyof MqttOutputs;
        this.outputs[key] = { state: 'UNCERTAIN', source: 'NONE' };
      }
    } else if (cmd.startsWith('V9_')) {
      this.extensions.V9 = { state: 'UNCERTAIN', source: 'NONE' };
    } else if (cmd.startsWith('V10_')) {
      this.extensions.V10 = { state: 'UNCERTAIN', source: 'NONE' };
    } else if (cmd === 'ALL_ON' || cmd === 'ALL_OFF') {
      (Object.keys(this.outputs) as (keyof MqttOutputs)[]).forEach((k) => {
        this.outputs[k] = { state: 'UNCERTAIN', source: 'NONE' };
      });
      this.extensions.V9 = { state: 'UNCERTAIN', source: 'NONE' };
      this.extensions.V10 = { state: 'UNCERTAIN', source: 'NONE' };
    }
  }

  /**
   * Sends a command using fresh UUID and Date.now() timestamp.
   * Disallows queuing while disconnected.
   * Disallows multiple pending requests.
   * If actuator command and requiresStatusRefresh is true, rejects sending.
   */
  public sendCommand(command: MqttCommand): { success: boolean; reason?: string } {
    if (!this.client || !this.isConnected) {
      return { success: false, reason: 'Broker is disconnected' };
    }

    if (!this.replySubscribed) {
      return { success: false, reason: 'Reply subscription pending' };
    }

    if (this.activePendingRequest) {
      return { success: false, reason: 'Another request is currently pending' };
    }

    // Require STATUS before actuator commands when in uncertain state or initial startup
    if (command !== 'STATUS' && this.requiresStatusRefresh) {
      return {
        success: false,
        reason: 'Uncertain state or initial startup: Deliberate Read Status required first',
      };
    }

    const issuedAt = Date.now();
    const expiresAt = issuedAt + BROKER_CONFIG.commandTtlMs;
    const request: JsonCommandRequest = {
      id: generateUUID(),
      command,
      issuedAt,
      expiresAt,
    };

    this.activePendingRequest = request;
    this.requestStatus = 'pending';
    this.listeners.forEach((l) => l.onRequestStatusChange('pending', command));

    const payloadString = JSON.stringify(request);
    this.addDiagnostic('tx', `Publish [${command}] id="${request.id.substring(0, 8)}..." -> ${BROKER_CONFIG.topics.cmd}`);

    this.client.publish(
      BROKER_CONFIG.topics.cmd,
      payloadString,
      { qos: 0, retain: false },
      (err) => {
        if (err) {
          this.clearPendingTimeout();
          this.activePendingRequest = null;
          this.requestStatus = 'error';
          this.addDiagnostic('error', `Publish failed: ${err.message}`);
          this.listeners.forEach((l) => l.onRequestStatusChange('error'));
        }
      }
    );

    // 8-second local timeout
    this.clearPendingTimeout();
    this.requestTimeoutTimer = setTimeout(() => {
      if (this.activePendingRequest && this.activePendingRequest.id === request.id) {
        this.activePendingRequest = null;
        this.requestStatus = 'timeout';
        this.isStale = true;
        this.requiresStatusRefresh = true;

        // If it was an actuator command, mark affected outputs uncertain
        if (command !== 'STATUS') {
          this.markCommandOutputsUncertain(command);
        }

        const timeoutOutcome: LastCommandOutcome = {
          command,
          result: 'unconfirmed',
          detail: 'Local UI timeout: No matching response received within 8 seconds',
          timestamp: Date.now(),
          id: request.id,
        };
        this.lastOutcome = timeoutOutcome;

        this.addDiagnostic('warn', `Timeout for [${command}] id="${request.id.substring(0, 8)}..."`);
        this.listeners.forEach((l) => {
          l.onRequestStatusChange('timeout');
          l.onRequiresStatusRefreshChange(this.requiresStatusRefresh);
          l.onOutputsChange(this.outputs, this.extensions, this.isStale, this.lastValidReplyTime);
          l.onLastCommandOutcome(timeoutOutcome);
        });
      }
    }, BROKER_CONFIG.timeoutMs);

    return { success: true };
  }

  public readStatus(): { success: boolean; reason?: string } {
    return this.sendCommand('STATUS');
  }

  private clearPendingTimeout() {
    if (this.requestTimeoutTimer) {
      clearTimeout(this.requestTimeoutTimer);
      this.requestTimeoutTimer = null;
    }
  }

  public disconnect() {
    this.clearPendingTimeout();
    this.activePendingRequest = null;
    this.requestStatus = 'idle';

    if (this.client) {
      try {
        this.client.end(true);
      } catch {
        // ignore
      }
      this.client = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.replySubscribed = false;
    this.homeStatus = 'unknown';
    this.requiresStatusRefresh = true;
    this.lastOutcome = null;

    // Reset output states to initial unknown
    this.outputs = JSON.parse(JSON.stringify(INITIAL_OUTPUTS));
    this.extensions = JSON.parse(JSON.stringify(INITIAL_EXTENSIONS));
    this.isStale = false;
    this.lastValidReplyTime = null;

    this.listeners.forEach((l) => {
      l.onConnectionChange(false, false);
      l.onReplySubscribedChange(false);
      l.onHomeStatusChange(this.homeStatus);
      l.onRequestStatusChange('idle');
      l.onRequiresStatusRefreshChange(true);
      l.onOutputsChange(this.outputs, this.extensions, false, null);
    });

    this.addDiagnostic('info', 'Disconnected from broker.');
  }
}

export const mqttService = new MqttService();
