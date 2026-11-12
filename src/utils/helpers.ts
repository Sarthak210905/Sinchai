// ============================================================
// Utility / helper functions for Sinchai
// ============================================================

import { TranslationKey } from '../localization/translations';

/**
 * Format a Unix timestamp (ms) into a human-readable string.
 * - If the timestamp is from today  → "Today 3:45 PM" (or "आज 3:45 PM")
 * - Otherwise                       → "Nov 12, 3:45 PM"
 */
export function formatTimestamp(ts: number, t?: (key: TranslationKey) => string): string {
  const date = new Date(ts);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    const todayLabel = t ? t('today') : 'Today';
    return `${todayLabel} ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `${dateStr}, ${timeStr}`;
}

// ─── Moisture status ──────────────────────────────────────────
export interface StatusResult {
  label: string;
  color: string;
}

export function getMoistureStatus(value: number, t?: (key: TranslationKey) => string): StatusResult {
  if (value <= 20) return { label: t ? t('moistureCritDry') : 'Critically Dry', color: '#B71C1C' };
  if (value <= 40) return { label: t ? t('moistureDry') : 'Dry', color: '#E65100' };
  if (value <= 60) return { label: t ? t('moistureOptimal') : 'Optimal', color: '#2E7D32' };
  if (value <= 80) return { label: t ? t('moistureMoist') : 'Moist', color: '#1565C0' };
  return { label: t ? t('moistureSaturated') : 'Saturated', color: '#6A1B9A' };
}

// ─── Temperature status ───────────────────────────────────────
export function getTemperatureStatus(value: number, t?: (key: TranslationKey) => string): StatusResult {
  if (value < 10) return { label: t ? t('tempVeryCold') : 'Very Cold', color: '#1565C0' };
  if (value <= 20) return { label: t ? t('tempCool') : 'Cool', color: '#0288D1' };
  if (value <= 30) return { label: t ? t('tempOptimal') : 'Optimal', color: '#2E7D32' };
  if (value <= 40) return { label: t ? t('tempWarm') : 'Warm', color: '#F57F17' };
  return { label: t ? t('tempVeryHot') : 'Very Hot', color: '#B71C1C' };
}
