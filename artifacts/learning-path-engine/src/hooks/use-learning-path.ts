import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generatePath, signature, validateInput, type PathInput } from '@/lib/engine';
import { readPersistedState, writePersistedState, type PersistedState } from '@/lib/progress-storage';
import { appendSession, courseProgress as calculateProgress, planCourse, removeSession } from '@/lib/time-blocking';
export type { ScheduleEntry } from '@/lib/progress-storage';

function getStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}
const empty = (sig: string): PersistedState => ({ signature: sig, completedIds: [], schedule: [] });

export function useLearningPath(targetRole: string, skillGaps: string[]) {
  const input = useMemo<PathInput>(() => ({ targetRole, skillGaps }), [targetRole, skillGaps]);
  const sig = useMemo(() => signature(input), [input]);
  const errors = useMemo(() => validateInput(input), [input]);
  const valid = !errors.targetRole && !errors.skillGaps;
  const nodes = useMemo(() => valid ? generatePath(input) : [], [valid, input]);
  const validIds = useMemo(() => new Set(nodes.map(node => node.id)), [nodes]);
  const [initial] = useState(() => readPersistedState(sig, getStorage(), validIds, new Map(nodes.map(node => [node.id, node.estimatedHours]))));
  const [persisted, setState] = useState(initial.state);
  const currentState = useRef(persisted);
  // Synchronous assignments must see earlier mutations even before React renders.
  const setPersisted = useCallback((update: (state: PersistedState) => PersistedState) => {
    currentState.current = update(currentState.current);
    setState(currentState.current);
  }, []);
  const [storageAvailable, setStorageAvailable] = useState(initial.available);
  const manualIds = useMemo(() => persisted.signature === sig
    ? persisted.completedIds.filter(id => validIds.has(id)) : [], [persisted, sig, validIds]);
  const schedule = useMemo(() => persisted.signature === sig
    ? persisted.schedule.filter(entry => validIds.has(entry.nodeId)) : [], [persisted, sig, validIds]);
  const courseProgress = useMemo(() => Object.fromEntries(nodes.map(node => [
    node.id, calculateProgress(node.id, node.estimatedHours, schedule, manualIds.includes(node.id)),
  ])), [nodes, schedule, manualIds]);
  const completedIds = useMemo(() => nodes.filter(node => courseProgress[node.id]!.completedHours >= node.estimatedHours)
    .map(node => node.id), [nodes, courseProgress]);
  const summary = useMemo(() => {
    const totalHours = nodes.reduce((sum, node) => sum + node.estimatedHours, 0);
    const completedHours = Object.values(courseProgress).reduce((sum, progress) => sum + progress.completedHours, 0);
    return { totalHours, completedHours, completedCount: completedIds.length,
      percentage: totalHours ? Math.round(completedHours / totalHours * 100) : 0 };
  }, [nodes, courseProgress, completedIds]);

  useEffect(() => {
    if (persisted.signature !== sig) setPersisted(current => current.signature === sig ? current : empty(sig));
  }, [sig, persisted.signature, setPersisted]);
  useEffect(() => {
    if (storageAvailable && !writePersistedState({ signature: sig, completedIds: manualIds, schedule }, getStorage())) setStorageAvailable(false);
  }, [sig, manualIds, schedule, storageAvailable]);

  const toggle = useCallback((nodeId: string) => {
    if (!validIds.has(nodeId)) return;
    setPersisted(current => {
      const base = current.signature === sig ? current : empty(sig);
      const node = nodes.find(item => item.id === nodeId)!;
      const shouldComplete = calculateProgress(nodeId, node.estimatedHours, base.schedule, base.completedIds.includes(nodeId)).percentage < 100;
      return { ...base,
        completedIds: shouldComplete ? [...new Set([...base.completedIds, nodeId])] : base.completedIds.filter(id => id !== nodeId),
        schedule: base.schedule.map(session => session.nodeId === nodeId ? { ...session, completed: shouldComplete } : session),
      };
    });
  }, [sig, validIds, nodes, setPersisted]);

  const assign = useCallback((nodeId: string, day: number, startMinutes: number, sessionHours: number, mode: 'single' | 'course' = 'single', week = 0): { ok: boolean; error?: string } => {
    const node = nodes.find(item => item.id === nodeId);
    if (!node) return { ok: false, error: 'Choose a course from the current path.' };
    const current = currentState.current;
    const base = current.signature === sig ? current : empty(sig);
    if (mode === 'course') {
      if (calculateProgress(nodeId, node.estimatedHours, base.schedule, base.completedIds.includes(nodeId)).percentage >= 100)
        return { ok: false, error: 'This course is already complete. Mark it incomplete before scheduling.' };
      const result = planCourse(nodeId, node.estimatedHours, base.schedule, day, startMinutes, sessionHours);
      if (!result.ok) return result;
      setPersisted(() => ({ ...base, schedule: result.sessions }));
      return { ok: true };
    }
    if (!Number.isFinite(sessionHours) || sessionHours < 0.25 || sessionHours > 8 ||
      !Number.isInteger(sessionHours * 4) || startMinutes % 15 !== 0)
      return { ok: false, error: 'Use a 15-minute start time and 0.25–8 hours in quarter-hour steps.' };
    const entries = appendSession(base.schedule, {
      id: crypto.randomUUID(), nodeId, week, day, startMinutes, durationMinutes: sessionHours * 60, completed: false,
    });
    if (!entries) return { ok: false, error: 'This session overlaps an existing session or falls outside 08:00–22:00. Choose another time or duration.' };
    setPersisted(() => ({ ...base, schedule: entries }));
    return { ok: true };
  }, [sig, nodes, setPersisted]);

  const toggleSession = useCallback((sessionId: string) => {
    setPersisted(current => {
      if (current.signature !== sig) return empty(sig);
      const session = current.schedule.find(item => item.id === sessionId);
      if (!session) return current;
      // Session state becomes authoritative again when undoing a manual course completion.
      return { ...current,
        completedIds: current.completedIds.filter(id => id !== session.nodeId),
        schedule: current.schedule.map(item => item.id === sessionId ? { ...item, completed: !item.completed } : item),
      };
    });
  }, [sig, setPersisted]);
  const removeSchedule = useCallback((sessionId: string) => {
    setPersisted(current => {
      if (current.signature !== sig) return empty(sig);
      const session = current.schedule.find(item => item.id === sessionId);
      const node = nodes.find(item => item.id === session?.nodeId);
      const fullyComplete = node && calculateProgress(node.id, node.estimatedHours, current.schedule, current.completedIds.includes(node.id)).percentage >= 100;
      return { ...current, schedule: removeSession(current.schedule, sessionId),
        completedIds: fullyComplete ? [...new Set([...current.completedIds, node.id])] : current.completedIds };
    });
  }, [sig, nodes, setPersisted]);
  const resetProgress = useCallback(() => setPersisted(current => current.signature === sig
    ? { ...current, completedIds: [], schedule: current.schedule.map(item => ({ ...item, completed: false })) } : empty(sig)), [sig, setPersisted]);
  return { nodes, errors, valid, completedIds, courseProgress, schedule, summary, storageAvailable,
    toggle, assign, toggleSession, removeSchedule, resetProgress };
}
