export type HistoryQrType = 'url' | 'wifi' | 'text' | 'email' | 'phone' | 'sms' | 'geo' | 'event' | 'whatsapp';

export interface HistoryEntry {
  id: string;
  type: HistoryQrType;
  /** Short human-readable label shown in the list, e.g. "example.com" or "Wi-Fi: HomeNet". */
  label: string;
  /** The exact final string that was encoded into the QR — re-rendering needs nothing else. */
  payload: string;
  createdAt: string;
}

export const MAX_HISTORY = 10;

const STORAGE_KEY = 'qrwebapp.history.v1';

function readAll(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read QR history from localStorage; treating as empty.', err);
    return [];
  }
}

function writeAll(entries: HistoryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function listHistory(): HistoryEntry[] {
  // Newest first.
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Saves a new generated QR to history. Keeps only the most recent
 * MAX_HISTORY entries — the oldest is silently dropped once the cap is
 * exceeded, since this is a rolling "latest N" log, not a fixed set of slots.
 */
export function saveToHistory(type: HistoryQrType, label: string, payload: string): void {
  const entries = listHistory();
  entries.unshift({
    id: crypto.randomUUID(),
    type,
    label,
    payload,
    createdAt: new Date().toISOString(),
  });
  writeAll(entries.slice(0, MAX_HISTORY));
}

export function deleteHistoryEntry(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
}
