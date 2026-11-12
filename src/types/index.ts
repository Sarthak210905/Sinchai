// ============================================================
// TypeScript interfaces for FarmerConnect
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
