export const STORAGE_KEY = 'learning-path-engine:v1';

export interface ScheduleEntry {
  nodeId: string;
  day: number;
  hour: number;
}

export interface PersistedState {
  signature: string;
  completedIds: string[];
  schedule: ScheduleEntry[];
}

export function readPersistedState(signature: string, storage: Storage | null, validIds?: ReadonlySet<string>) {
  const empty: PersistedState = { signature, completedIds: [], schedule: [] };
  if (!storage) return { available: false, state: empty };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { available: true, state: empty };
    const saved = JSON.parse(raw) as Partial<PersistedState>;
    if (saved.signature !== signature) return { available: true, state: empty };
    return {
      available: true,
      state: {
        signature,
        completedIds: Array.isArray(saved.completedIds)
          ? [...new Set(saved.completedIds.filter((id): id is string => typeof id === 'string' && (!validIds || validIds.has(id))))]
          : [],
        schedule: Array.isArray(saved.schedule)
          ? saved.schedule.filter((entry): entry is ScheduleEntry =>
              !!entry && typeof entry.nodeId === 'string' &&
              Number.isInteger(entry.day) && entry.day >= 0 && entry.day < 7 &&
              Number.isInteger(entry.hour) && entry.hour >= 8 && entry.hour <= 20 &&
              (!validIds || validIds.has(entry.nodeId)))
          : [],
      },
    };
  } catch {
    return { available: false, state: empty };
  }
}

export function writePersistedState(state: PersistedState, storage: Storage | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
