// ============================================================
// TypeScript interfaces for Sinchai
// ============================================================

/**
 * Sensor data snapshot from the hardware sensors
 */
export interface SensorData {
  soilMoisture: number;   // Percentage (0–100)
  temperature: number;    // Degrees Celsius
  humidity: number;       // Percentage (0–100)
  waterFlow: number;      // Litres per minute
  timestamp: number;      // Unix timestamp (ms)
}

/**
 * Current pump status written by either the app or hardware (Firebase RTDB)
 */
export interface PumpStatus {
  isOn: boolean;          // true = pump running, false = pump off
  lastChanged: number;    // Unix timestamp (ms)
  changedBy: string;      // User email or "hardware"
}

/**
 * Farmer user profile stored in Realtime DB under users/{uid}
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  farmName: string;
}

// ============================================================
// MQTT Hardware Integration Types (Valve Control Firmware)
// ============================================================

export type MqttOutputState = 'ON' | 'OFF' | 'UNKNOWN' | 'UNCERTAIN';
export type OutputSource = 'STATUS' | 'ACK' | 'NONE';

export interface OutputItemState {
  state: MqttOutputState;
  source: OutputSource;
}

export interface MqttOutputs {
  DO1: OutputItemState;
  DO2: OutputItemState;
  DO3: OutputItemState;
  DO4: OutputItemState;
  DO5: OutputItemState;
  DO6: OutputItemState;
  DO7: OutputItemState;
  DO8: OutputItemState;
}

export interface ExtensionOutputs {
  V9: OutputItemState;
  V10: OutputItemState;
}

export type HomeConnectionStatus = 'online' | 'offline' | 'unknown';

export type RequestStatus = 'idle' | 'pending' | 'received' | 'timeout' | 'error';

export type MqttCommand =
  | 'STATUS'
  | 'DO1_ON'
  | 'DO1_OFF'
  | 'DO2_ON'
  | 'DO2_OFF'
  | 'DO3_ON'
  | 'DO3_OFF'
  | 'DO4_ON'
  | 'DO4_OFF'
  | 'DO5_ON'
  | 'DO5_OFF'
  | 'DO6_ON'
  | 'DO6_OFF'
  | 'DO7_ON'
  | 'DO7_OFF'
  | 'DO8_ON'
  | 'DO8_OFF'
  | 'V9_ON'
  | 'V9_OFF'
  | 'V10_ON'
  | 'V10_OFF'
  | 'ALL_ON'
  | 'ALL_OFF';

export interface JsonCommandRequest {
  id: string;
  command: MqttCommand;
  issuedAt: number;
  expiresAt: number;
}

export type CommandResponseResult =
  | 'acknowledged'
  | 'status_received'
  | 'partial'
  | 'controller_error'
  | 'unconfirmed'
  | 'rejected'
  | 'duplicate'
  | 'busy'
  | 'unsolicited'
  | 'unmatched_response';

export interface JsonCommandResponse {
  type: 'command_result';
  id?: string;
  command?: string;
  result: CommandResponseResult | string;
  detail?: string;
}

export interface LastCommandOutcome {
  command: MqttCommand;
  result: string;
  detail: string;
  timestamp: number;
  id: string;
}

export interface DiagnosticLogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'warn' | 'error' | 'rx' | 'tx';
  message: string;
}

export interface MqttCredentials {
  host: string;
  port: number;
  path: string;
  username: string;
  password: string;
}
