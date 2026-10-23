import { useCallback, useEffect, useMemo, useState } from 'react';
import { generatePath, signature, summarize, validateInput, type PathInput } from '@/lib/engine';
import { readPersistedState, writePersistedState, type PersistedState, type ScheduleEntry } from '@/lib/progress-storage';
export type { ScheduleEntry } from '@/lib/progress-storage';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function useLearningPath(targetRole: string, skillGaps: string[]) {
  const input = useMemo<PathInput>(() => ({ targetRole, skillGaps }), [targetRole, skillGaps]);
  const sig = useMemo(() => signature(input), [input]);
  const initial = useMemo(() => {
    const ids = new Set(generatePath(input).map(node => node.id));
    return readPersistedState(sig, getStorage(), ids);
  }, []); // honor upstream props on first mount
  const [persisted, setPersisted] = useState(initial.state);
  const [storageAvailable, setStorageAvailable] = useState(initial.available);
  const errors = useMemo(() => validateInput(input), [input]);
  const valid = !errors.targetRole && !errors.skillGaps;
  const nodes = useMemo(() => valid ? generatePath(input) : [], [valid, input]);
  const effective = persisted.signature === sig ? persisted : { signature: sig, completedIds: [], schedule: [] };
  const validIds = useMemo(() => new Set(nodes.map(node => node.id)), [nodes]);
  const completedIds = effective.completedIds.filter(id => validIds.has(id));
  const schedule = effective.schedule.filter(entry => validIds.has(entry.nodeId));
  const summary = useMemo(() => summarize(nodes, completedIds), [nodes, completedIds]);

  // Every upstream input change invalidates prior progress and calendar slots.
  useEffect(() => {
    if (persisted.signature !== sig) setPersisted({ signature: sig, completedIds: [], schedule: [] });
  }, [sig, persisted.signature]);

  useEffect(() => {
    if (!storageAvailable) return;
    try {
      if (!writePersistedState({ signature: sig, completedIds, schedule }, getStorage())) setStorageAvailable(false);
    } catch { setStorageAvailable(false); }
  }, [sig, completedIds, schedule, storageAvailable]);

  const toggle = useCallback((nodeId: string) => {
    if (!validIds.has(nodeId)) return;
    setPersisted(current => {
      const currentIds = current.signature === sig ? current.completedIds : [];
      return {
        ...current, signature: sig,
        completedIds: currentIds.includes(nodeId) ? currentIds.filter(id => id !== nodeId) : [...currentIds, nodeId],
      };
    });
  }, [sig, validIds]);

  const assign = useCallback((nodeId: string, day: number, hour: number): boolean => {
    if (!validIds.has(nodeId) || !Number.isInteger(day) || day < 0 || day > 6 || !Number.isInteger(hour) || hour < 8 || hour > 20) return false;
    if (schedule.some(entry => entry.day === day && entry.hour === hour && entry.nodeId !== nodeId)) return false;
    setPersisted(current => {
      const entries = current.signature === sig ? current.schedule : [];
      return {
        ...current,
        signature: sig,
        schedule: [...entries.filter(entry => entry.nodeId !== nodeId), { nodeId, day, hour }],
      };
    });
    return true;
  }, [sig, validIds, schedule]);

  const removeSchedule = useCallback((nodeId: string) => {
    setPersisted(current => ({
      ...current, signature: sig,
      schedule: (current.signature === sig ? current.schedule : []).filter(entry => entry.nodeId !== nodeId),
    }));
  }, [sig]);

  const resetProgress = useCallback(() => {
    setPersisted(current => ({ ...current, signature: sig, completedIds: [], schedule: [] }));
  }, [sig]);

  return { nodes, errors, valid, completedIds, schedule, summary, storageAvailable, toggle, assign, removeSchedule, resetProgress };
}
