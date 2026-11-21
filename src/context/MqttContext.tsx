import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  MqttOutputs,
  HomeConnectionStatus,
  RequestStatus,
  DiagnosticLogEntry,
} from '../types';
import { mqttService, MqttServiceListener } from '../services/mqttService';

interface MqttContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  replySubscribed: boolean;
  homeStatus: HomeConnectionStatus;
  outputs: MqttOutputs;
  isStale: boolean;
  lastValidReplyTime: number | null;
  requestStatus: RequestStatus;
  diagnostics: DiagnosticLogEntry[];
  connect: (username: string, password: string) => void;
  disconnect: () => void;
  readStatus: () => boolean;
  clearDiagnostics: () => void;
  hasCredentialsInMemory: boolean;
}

const MqttContext = createContext<MqttContextValue | null>(null);

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

export const MqttProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [replySubscribed, setReplySubscribed] = useState(false);
  const [homeStatus, setHomeStatus] = useState<HomeConnectionStatus>('unknown');
  const [outputs, setOutputs] = useState<MqttOutputs>(INITIAL_OUTPUTS);
  const [isStale, setIsStale] = useState(false);
  const [lastValidReplyTime, setLastValidReplyTime] = useState<number | null>(null);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('idle');
  const [diagnostics, setDiagnostics] = useState<DiagnosticLogEntry[]>([]);
  const [hasCredentialsInMemory, setHasCredentialsInMemory] = useState(false);

  // In-memory only credentials reference — strictly NEVER persisted or written to disk
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
      onOutputsChange: (newOutputs, stale, time) => {
        setOutputs(newOutputs);
        setIsStale(stale);
        setLastValidReplyTime(time);
      },
      onRequestStatusChange: (status) => {
        setRequestStatus(status);
      },
      onDiagnostic: (entry) => {
        setDiagnostics((prev) => [entry, ...prev].slice(0, 50)); // keep last 50 entries
      },
    };

    const unsubscribe = mqttService.subscribeListener(listener);

    return () => {
      unsubscribe();
      mqttService.disconnect();
      inMemoryCredsRef.current = null;
    };
  }, []);

  const connect = useCallback((username: string, password: string) => {
    // Keep in memory only
    inMemoryCredsRef.current = { username, password };
    setHasCredentialsInMemory(true);
    mqttService.connect(username, password);
  }, []);

  const disconnect = useCallback(() => {
    mqttService.disconnect();
    inMemoryCredsRef.current = null;
    setHasCredentialsInMemory(false);
  }, []);

  const readStatus = useCallback((): boolean => {
    return mqttService.publishStatus();
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
        isStale,
        lastValidReplyTime,
        requestStatus,
        diagnostics,
        connect,
        disconnect,
        readStatus,
        clearDiagnostics,
        hasCredentialsInMemory,
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
