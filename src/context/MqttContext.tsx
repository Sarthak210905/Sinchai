import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  MqttOutputs,
  ExtensionOutputs,
  HomeConnectionStatus,
  RequestStatus,
  DiagnosticLogEntry,
  MqttCommand,
  LastCommandOutcome,
} from '../types';
import { mqttService, MqttServiceListener } from '../services/mqttService';
import { useAuth } from './AuthContext';

interface MqttContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  replySubscribed: boolean;
  homeStatus: HomeConnectionStatus;
  outputs: MqttOutputs;
  extensions: ExtensionOutputs;
  isStale: boolean;
  lastValidReplyTime: number | null;
  requestStatus: RequestStatus;
  pendingCommand?: MqttCommand;
  requiresStatusRefresh: boolean;
  lastCommandOutcome: LastCommandOutcome | null;
  diagnostics: DiagnosticLogEntry[];
  commissioningMode: boolean;
  setCommissioningMode: (val: boolean) => void;
  connect: (username: string, password: string) => void;
  disconnect: () => void;
  sendCommand: (cmd: MqttCommand) => { success: boolean; reason?: string };
  readStatus: () => { success: boolean; reason?: string };
  clearDiagnostics: () => void;
}

const MqttContext = createContext<MqttContextValue | null>(null);

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

export const MqttProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [replySubscribed, setReplySubscribed] = useState(false);
  const [homeStatus, setHomeStatus] = useState<HomeConnectionStatus>('unknown');
  const [outputs, setOutputs] = useState<MqttOutputs>(INITIAL_OUTPUTS);
  const [extensions, setExtensions] = useState<ExtensionOutputs>(INITIAL_EXTENSIONS);
  const [isStale, setIsStale] = useState(false);
  const [lastValidReplyTime, setLastValidReplyTime] = useState<number | null>(null);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('idle');
  const [pendingCommand, setPendingCommand] = useState<MqttCommand | undefined>(undefined);
  const [requiresStatusRefresh, setRequiresStatusRefresh] = useState(true);
  const [lastCommandOutcome, setLastCommandOutcome] = useState<LastCommandOutcome | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticLogEntry[]>([]);

  // Commissioning Mode: initially enabled (only DO1 enabled)
  const [commissioningMode, setCommissioningMode] = useState(true);

  // Strictly in-memory credentials reference (never stored in AsyncStorage or localStorage)
  const inMemoryCredsRef = useRef<{ username: string; password: string } | null>(null);

  useEffect(() => {
    const listener: MqttServiceListener = {
      onConnectionChange: (conn, conning) => {
        setIsConnected(conn);
        setIsConnecting(conning);
      },
      onReplySubscribedChange: (subbed) => {
        setReplySubscribed(subbed);
      },
      onHomeStatusChange: (status) => {
        setHomeStatus(status);
      },
      onOutputsChange: (newOutputs, newExt, stale, time) => {
        setOutputs({ ...newOutputs });
        setExtensions({ ...newExt });
        setIsStale(stale);
        setLastValidReplyTime(time);
      },
      onRequestStatusChange: (status, cmd) => {
        setRequestStatus(status);
        setPendingCommand(cmd);
      },
      onRequiresStatusRefreshChange: (req) => {
        setRequiresStatusRefresh(req);
      },
      onLastCommandOutcome: (outcome) => {
        setLastCommandOutcome(outcome);
      },
      onDiagnostic: (entry) => {
        setDiagnostics((prev) => [entry, ...prev].slice(0, 50));
      },
    };

    const unsubscribe = mqttService.subscribeListener(listener);

    return () => {
      unsubscribe();
      mqttService.disconnect();
      inMemoryCredsRef.current = null;
    };
  }, []);

  // Disconnect MQTT and wipe credentials when Firebase user logs out
  useEffect(() => {
    if (!user && isConnected) {
      mqttService.disconnect();
      inMemoryCredsRef.current = null;
    }
  }, [user, isConnected]);

  const connect = useCallback((username: string, password: string) => {
    inMemoryCredsRef.current = { username, password };
    mqttService.connect(username, password);
  }, []);

  const disconnect = useCallback(() => {
    mqttService.disconnect();
    inMemoryCredsRef.current = null;
    setLastCommandOutcome(null);
  }, []);

  const sendCommand = useCallback((cmd: MqttCommand) => {
    return mqttService.sendCommand(cmd);
  }, []);

  const readStatus = useCallback(() => {
    return mqttService.readStatus();
  }, []);

  const clearDiagnostics = useCallback(() => {
    setDiagnostics([]);
  }, []);

  return (
    <MqttContext.Provider
      value={{
        isConnected,
        isConnecting,
        replySubscribed,
        homeStatus,
        outputs,
        extensions,
        isStale,
        lastValidReplyTime,
        requestStatus,
        pendingCommand,
        requiresStatusRefresh,
        lastCommandOutcome,
        diagnostics,
        commissioningMode,
        setCommissioningMode,
        connect,
        disconnect,
        sendCommand,
        readStatus,
        clearDiagnostics,
      }}
    >
      {children}
    </MqttContext.Provider>
  );
};

export const useMqtt = (): MqttContextValue => {
  const context = useContext(MqttContext);
  if (!context) {
    throw new Error('useMqtt must be used within an MqttProvider');
  }
  return context;
};
