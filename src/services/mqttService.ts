import mqtt, { MqttClient } from 'mqtt';
import {
  MqttOutputs,
  MqttOutputState,
  HomeConnectionStatus,
  RequestStatus,
  DiagnosticLogEntry,
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
  timeoutMs: 8000, // 8-second local UI timeout (gives firmware 5s timeout time to arrive)
};

const INITIAL_OUTPUTS: MqttOutputs = {
  DO1: 'UNKNOWN',
  DO2: 'UNKNOWN',
  DO3: 'UNKNOWN',
  DO4: 'UNKNOWN',
  DO5: 'UNKNOWN',
  DO6: 'UNKNOWN',
  DO7: 'UNKNOWN',
  DO8: 'UNKNOWN',
};

export interface MqttServiceListener {
  onConnectionChange: (connected: boolean, connecting: boolean) => void;
  onReplySubscribedChange: (subscribed: boolean) => void;
  onHomeStatusChange: (status: HomeConnectionStatus) => void;
  onOutputsChange: (outputs: MqttOutputs, isStale: boolean, lastValidTime: number | null) => void;
  onRequestStatusChange: (status: RequestStatus) => void;
  onDiagnostic: (entry: DiagnosticLogEntry) => void;
}

class MqttService {
  private client: MqttClient | null = null;
  private listeners: Set<MqttServiceListener> = new Set();

  private isConnected = false;
  private isConnecting = false;
  private replySubscribed = false;
  private homeStatus: HomeConnectionStatus = 'unknown';
  private outputs: MqttOutputs = { ...INITIAL_OUTPUTS };
  private isStale = false;
  private lastValidReplyTime: number | null = null;
  private requestStatus: RequestStatus = 'idle';
  private requestTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private activePendingRequest = false;

  public subscribeListener(listener: MqttServiceListener): () => void {
    this.listeners.add(listener);
    // Emit current state immediately to the listener
    listener.onConnectionChange(this.isConnected, this.isConnecting);
    listener.onReplySubscribedChange(this.replySubscribed);
    listener.onHomeStatusChange(this.homeStatus);
    listener.onOutputsChange(this.outputs, this.isStale, this.lastValidReplyTime);
    listener.onRequestStatusChange(this.requestStatus);

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
    // Prevent duplicate connections
    if (this.client || this.isConnecting || this.isConnected) {
      return;
    }

    this.isConnecting = true;
    this.listeners.forEach((l) => l.onConnectionChange(false, true));
    this.addDiagnostic('info', 'Connecting to EMQX Cloud broker over WSS (clean session)...');

    // Unique MQTT client ID per app connection (different from ESP32 client ID)
    const clientId = `sinchai_app_${Math.random().toString(36).substring(2, 10)}`;

    try {
      this.client = mqtt.connect(BROKER_CONFIG.url, {
        clientId,
        username,
        password,
        clean: true,
        queueQoSZero: false, // Disable MQTT.js QoS-zero offline queueing
        reconnectPeriod: 0,  // Disable automatic reconnection/replay to prevent re-issuing commands
        connectTimeout: 10000,
        keepalive: 60,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.listeners.forEach((l) => l.onConnectionChange(true, false));
        this.addDiagnostic('info', `Broker connected. Client ID: ${clientId}`);

        // Subscribe to reply and connection topics after connection
        this.subscribeTopics();
      });

      this.client.on('message', (topic, payload) => {
        const text = payload.toString().trim();
        this.handleIncomingMessage(topic, text);
      });

      this.client.on('error', (err) => {
        this.isConnecting = false;
        // Never log credentials; only log error name/message
        this.addDiagnostic('error', `MQTT Error: ${err.message || 'Connection failure'}`);
        this.listeners.forEach((l) => l.onConnectionChange(this.isConnected, false));
      });

      this.client.on('close', () => {
        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.isConnecting = false;
        this.replySubscribed = false;
        this.listeners.forEach((l) => {
          l.onConnectionChange(false, false);
          l.onReplySubscribedChange(false);
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

    // Subscribe to reply topic
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

    // Subscribe to Home MQTT connection topic
    this.client.subscribe(BROKER_CONFIG.topics.connection, { qos: 0 }, (err) => {
      if (err) {
        this.addDiagnostic('error', `Failed to subscribe to connection topic: ${err.message}`);
      } else {
        this.addDiagnostic('info', `Subscribed to ${BROKER_CONFIG.topics.connection}`);
      }
    });
  }

  private handleIncomingMessage(topic: string, message: string) {
    if (topic === BROKER_CONFIG.topics.connection) {
      // Home connection announcements
      const lower = message.toLowerCase();
      if (lower.includes('online')) {
        this.homeStatus = 'online';
      } else if (lower.includes('offline')) {
        this.homeStatus = 'offline';
      } else {
        this.homeStatus = 'unknown';
      }
      this.addDiagnostic('rx', `[Home Announcement] ${message}`);
      this.listeners.forEach((l) => l.onHomeStatusChange(this.homeStatus));
      return;
    }

    if (topic === BROKER_CONFIG.topics.reply) {
      this.addDiagnostic('rx', `[Reply] ${message}`);

      // Parse response format:
      // Example: STATUS,MAIN,DO1=OFF,DO2=OFF,DO3=OFF,DO4=OFF,DO5=OFF,DO6=OFF,DO7=OFF,DO8=OFF
      const parsedOutputs = this.parseStatusReply(message);

      if (parsedOutputs) {
        // Valid status reply received
        this.clearTimeoutTimer();
        this.outputs = parsedOutputs;
        this.isStale = false;
        this.lastValidReplyTime = Date.now();

        if (this.activePendingRequest) {
          this.activePendingRequest = false;
          this.requestStatus = 'received';
          this.listeners.forEach((l) => l.onRequestStatusChange(this.requestStatus));
        }

        this.listeners.forEach((l) =>
          l.onOutputsChange(this.outputs, this.isStale, this.lastValidReplyTime)
        );
        return;
      }

      // If not a valid DO output reply, handle diagnostics:
      // Possible replies: TIMEOUT, BUSY, BLOCKED, UNRECOGNIZED RX, etc.
      if (this.activePendingRequest) {
        this.clearTimeoutTimer();
        this.activePendingRequest = false;
        if (message.startsWith('TIMEOUT')) {
          this.requestStatus = 'timeout';
          this.isStale = true; // Mark last-known as stale
        } else {
          this.requestStatus = 'idle';
        }
        this.listeners.forEach((l) => {
          l.onRequestStatusChange(this.requestStatus);
          l.onOutputsChange(this.outputs, this.isStale, this.lastValidReplyTime);
        });
      }
    }
  }

  /**
   * Parse and validate DO1..DO8 from plain text STATUS reply.
   * Returns null if string is not a valid output report.
   */
  private parseStatusReply(message: string): MqttOutputs | null {
    // Must start with STATUS,MAIN
    if (!message.startsWith('STATUS,MAIN')) {
      return null;
    }

    // Split comma-separated tokens
    const tokens = message.split(',');
    const newOutputs: Partial<MqttOutputs> = {};

    for (let i = 1; i < tokens.length; i++) {
      const part = tokens[i].trim();
      const match = part.match(/^(DO[1-8])=(ON|OFF)$/);
      if (match) {
        const key = match[1] as keyof MqttOutputs;
        const val = match[2] as MqttOutputState;
        newOutputs[key] = val;
      }
    }

    // Verify all DO1 through DO8 fields exist and are validated
    const requiredKeys: (keyof MqttOutputs)[] = [
      'DO1',
      'DO2',
      'DO3',
      'DO4',
      'DO5',
      'DO6',
      'DO7',
      'DO8',
    ];
    const allValid = requiredKeys.every(
      (k) => newOutputs[k] === 'ON' || newOutputs[k] === 'OFF'
    );

    if (allValid) {
      return newOutputs as MqttOutputs;
    }

    return null;
  }

  /**
   * Publish STATUS command
   * Requirements:
   * - Wait for successful reply subscription before enabling
   * - Publish STATUS with QoS 0 and retain false
   * - Plain text, NOT JSON
   * - Only one pending STATUS request at a time
   * - 8-second local UI timeout
   * - Never queue commands while disconnected
   */
  public publishStatus(): boolean {
    if (!this.client || !this.isConnected) {
      this.addDiagnostic('warn', 'Cannot publish: Broker disconnected');
      return false;
    }

    if (!this.replySubscribed) {
      this.addDiagnostic('warn', 'Cannot publish: Reply topic subscription pending');
      return false;
    }

    if (this.activePendingRequest) {
      this.addDiagnostic('warn', 'Cannot publish: A STATUS request is already pending');
      return false;
    }

    this.activePendingRequest = true;
    this.requestStatus = 'pending';
    this.listeners.forEach((l) => l.onRequestStatusChange(this.requestStatus));

    this.addDiagnostic('tx', `Publish: STATUS -> ${BROKER_CONFIG.topics.cmd} (QoS 0)`);

    // Publish plain text STATUS
    this.client.publish(
      BROKER_CONFIG.topics.cmd,
      'STATUS',
      { qos: 0, retain: false },
      (err) => {
        if (err) {
          this.clearTimeoutTimer();
          this.activePendingRequest = false;
          this.requestStatus = 'idle';
          this.addDiagnostic('error', `Publish error: ${err.message}`);
          this.listeners.forEach((l) => l.onRequestStatusChange(this.requestStatus));
        }
      }
    );

    // Set 8-second local timeout
    this.clearTimeoutTimer();
    this.requestTimeoutTimer = setTimeout(() => {
      if (this.activePendingRequest) {
        this.activePendingRequest = false;
        this.requestStatus = 'timeout';
        this.isStale = true; // Retain last-known values, labeled stale
        this.addDiagnostic('warn', 'Local UI timeout (8s expired without response)');
        this.listeners.forEach((l) => {
          l.onRequestStatusChange(this.requestStatus);
          l.onOutputsChange(this.outputs, this.isStale, this.lastValidReplyTime);
        });
      }
    }, BROKER_CONFIG.timeoutMs);

    return true;
  }

  private clearTimeoutTimer() {
    if (this.requestTimeoutTimer) {
      clearTimeout(this.requestTimeoutTimer);
      this.requestTimeoutTimer = null;
    }
  }

  public disconnect() {
    this.clearTimeoutTimer();
    this.activePendingRequest = false;
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

    this.listeners.forEach((l) => {
      l.onConnectionChange(false, false);
      l.onReplySubscribedChange(false);
      l.onHomeStatusChange(this.homeStatus);
      l.onRequestStatusChange(this.requestStatus);
    });

    this.addDiagnostic('info', 'Disconnected from broker.');
  }
}

// Export singleton instance
export const mqttService = new MqttService();
