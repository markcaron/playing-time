import type { StoredRoster } from './types.js';

const STORAGE_KEY = 'playing-time-roster';

export function loadRoster(): StoredRoster {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as StoredRoster;
      if (data.players && Array.isArray(data.players)) return data;
    }
  } catch { /* ignore corrupt data */ }
  return { teamName: '', players: [], halfLength: 45 };
}

export function saveRoster(data: StoredRoster): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
