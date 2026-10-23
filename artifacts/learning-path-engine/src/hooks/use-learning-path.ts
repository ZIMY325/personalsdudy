import { useCallback, useEffect, useMemo, useState } from 'react';
import { generatePath, signature, validateInput, type PathInput } from '@/lib/engine';
import { readPersistedState, writePersistedState, type PersistedState } from '@/lib/progress-storage';
import { courseProgress as calculateProgress, planCourse } from '@/lib/time-blocking';
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
  const [persisted, setPersisted] = useState(initial.state);
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
    if (persisted.signature !== sig) setPersisted(empty(sig));
  }, [sig, persisted.signature]);
  useEffect(() => {
    if (storageAvailable && !writePersistedState({ signature: sig, completedIds: manualIds, schedule }, getStorage())) setStorageAvailable(false);
  }, [sig, manualIds, schedule, storageAvailable]);

  const toggle = useCallback((nodeId: string) => {
    if (!validIds.has(nodeId)) return;
    const shouldComplete = !completedIds.includes(nodeId);
    setPersisted(current => {
      const base = current.signature === sig ? current : empty(sig);
      return { ...base,
        completedIds: shouldComplete ? [...new Set([...base.completedIds, nodeId])] : base.completedIds.filter(id => id !== nodeId),
        schedule: base.schedule.map(session => session.nodeId === nodeId ? { ...session, completed: shouldComplete } : session),
      };
    });
  }, [sig, validIds, completedIds]);

  const assign = useCallback((nodeId: string, day: number, startMinutes: number, sessionHours: number): { ok: boolean; error?: string } => {
    const node = nodes.find(item => item.id === nodeId);
    if (!node) return { ok: false, error: 'Choose a course from the current path.' };
    if (completedIds.includes(nodeId)) return { ok: false, error: 'This course is already complete. Mark it incomplete before scheduling.' };
    const result = planCourse(nodeId, node.estimatedHours, schedule, day, startMinutes, sessionHours);
    if (!result.ok) return result;
    setPersisted(current => ({ ...(current.signature === sig ? current : empty(sig)), schedule: result.sessions }));
    return { ok: true };
  }, [sig, nodes, schedule, completedIds]);

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
  }, [sig]);
  const removeSchedule = useCallback((sessionId: string) => {
    setPersisted(current => current.signature === sig
      ? { ...current, schedule: current.schedule.filter(item => item.id !== sessionId) } : empty(sig));
  }, [sig]);
  const resetProgress = useCallback(() => setPersisted(current => current.signature === sig
    ? { ...current, completedIds: [], schedule: current.schedule.map(item => ({ ...item, completed: false })) } : empty(sig)), [sig]);
  return { nodes, errors, valid, completedIds, courseProgress, schedule, summary, storageAvailable,
    toggle, assign, toggleSession, removeSchedule, resetProgress };
}
