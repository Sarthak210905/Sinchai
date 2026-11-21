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
 * Current pump status written by either the app or hardware
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
// MQTT Hardware Integration Types (Read-Only)
// ============================================================

export type MqttOutputState = 'ON' | 'OFF' | 'UNKNOWN';

export interface MqttOutputs {
  DO1: MqttOutputState;
  DO2: MqttOutputState;
  DO3: MqttOutputState;
  DO4: MqttOutputState;
  DO5: MqttOutputState;
  DO6: MqttOutputState;
  DO7: MqttOutputState;
  DO8: MqttOutputState;
}

export type HomeConnectionStatus = 'online' | 'offline' | 'unknown';

export type RequestStatus = 'idle' | 'pending' | 'received' | 'timeout';

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
