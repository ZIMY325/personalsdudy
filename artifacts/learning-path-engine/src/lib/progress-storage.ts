import { DAY_END, DAY_START, type StudySession } from './time-blocking';
export const STORAGE_KEY = 'learning-path-engine:v1';
export type ScheduleEntry = StudySession;

export interface PersistedState {
  signature: string;
  completedIds: string[];
  schedule: ScheduleEntry[];
}

export function readPersistedState(
  signature: string, storage: Storage | null, validIds?: ReadonlySet<string>, courseHours?: ReadonlyMap<string, number>,
) {
  const empty: PersistedState = { signature, completedIds: [], schedule: [] };
  if (!storage) return { available: false, state: empty };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { available: true, state: empty };
    const saved = JSON.parse(raw) as Partial<PersistedState>;
    if (saved.signature !== signature) return { available: true, state: empty };
    const completedIds = Array.isArray(saved.completedIds)
      ? [...new Set(saved.completedIds.filter((id): id is string => typeof id === 'string' && (!validIds || validIds.has(id))))]
      : [];
    return {
      available: true,
      state: {
        signature,
        completedIds,
        schedule: migrateSessions(saved.schedule, validIds, courseHours).map(entry =>
          completedIds.includes(entry.nodeId) ? { ...entry, completed: true } : entry),
      },
    };
  } catch {
    return { available: false, state: empty };
  }
}

function migrateSessions(value: unknown, validIds?: ReadonlySet<string>, courseHours?: ReadonlyMap<string, number>): StudySession[] {
  if (!Array.isArray(value)) return [];
  const result: StudySession[] = [];
  const allocated = new Map<string, number>();
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Record<string, unknown>;
    if (typeof entry.nodeId !== 'string' || (validIds && !validIds.has(entry.nodeId))) continue;
    const week = typeof entry.week === 'number' ? entry.week : 0;
    const day = entry.day;
    const startMinutes = typeof entry.startMinutes === 'number' ? entry.startMinutes : Number(entry.hour) * 60;
    let durationMinutes = typeof entry.durationMinutes === 'number' ? entry.durationMinutes : 60;
    if (!Number.isInteger(week) || week < 0 || week >= 52 ||
        typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day >= 7 ||
        !Number.isInteger(startMinutes) || startMinutes < DAY_START ||
        !Number.isInteger(durationMinutes) || durationMinutes <= 0 ||
        startMinutes + durationMinutes > DAY_END) continue;
    const id = typeof entry.id === 'string' ? entry.id : `${entry.nodeId}:w${week}:d${day}:m${startMinutes}`;
    if (result.some(session => session.id === id)) continue;
    const limit = courseHours?.get(entry.nodeId);
    if (limit !== undefined) durationMinutes = Math.min(durationMinutes, Math.max(0, Math.round(limit * 60) - (allocated.get(entry.nodeId) ?? 0)));
    if (!durationMinutes) continue;
    allocated.set(entry.nodeId, (allocated.get(entry.nodeId) ?? 0) + durationMinutes);
    result.push({ id, nodeId: entry.nodeId, week, day, startMinutes, durationMinutes, completed: entry.completed === true });
  }
  return result;
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
