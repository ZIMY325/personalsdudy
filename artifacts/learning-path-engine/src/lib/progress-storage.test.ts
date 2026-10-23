import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  appendSession, isValidSessionTime, removeSession, sessionsOverlap, type StudySession,
} from './time-blocking';
import { readPersistedState, STORAGE_KEY, writePersistedState } from './progress-storage';

const session = (overrides: Partial<StudySession> = {}): StudySession => ({
  id: 'first', nodeId: 'python-video', week: 0, day: 0,
  startMinutes: 600, durationMinutes: 120, completed: false, ...overrides,
});

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

test('independent sessions append without moving the course and remove individually', () => {
  const first = session();
  const second = session({ id: 'second', day: 2, durationMinutes: 90 });
  const original = [first];
  const entries = appendSession(original, second)!;
  assert.deepEqual(entries, [first, second]);
  assert.deepEqual(original, [first]);
  assert.deepEqual(removeSession(entries, 'first'), [second]);
  assert.deepEqual(removeSession(entries, 'second'), [first]);
  assert.deepEqual(removeSession(entries, 'missing'), entries);
});

test('conflicts cover the full duration, including the same course, but respect weeks', () => {
  const first = session();
  for (const overlapping of [
    session({ id: 'second', startMinutes: 660 }),
    session({ id: 'second', startMinutes: 540, durationMinutes: 240 }),
    session({ id: 'second', startMinutes: 480, durationMinutes: 150 }),
    session({ id: 'second', startMinutes: 660, nodeId: 'networking-video' }),
    session({ id: 'second', durationMinutes: 30 }),
  ]) {
    assert.equal(sessionsOverlap(first, overlapping), true);
    assert.equal(sessionsOverlap(overlapping, first), true);
    assert.equal(appendSession([first], overlapping), null);
  }
  for (const allowed of [
    session({ id: 'second', startMinutes: 720 }),
    session({ id: 'second', startMinutes: 480 }),
    session({ id: 'second', day: 1 }),
    session({ id: 'second', week: 1 }),
  ]) assert.equal(appendSession([first], allowed)?.length, 2);
  assert.equal(appendSession([first], session({ day: 1 })), null);
});

test('session bounds reject malformed appointments and allow closing time', () => {
  assert.equal(isValidSessionTime(51, 6, 1260, 60), true);
  assert.equal(isValidSessionTime(0, 0, 480, 840), true);
  assert.equal(isValidSessionTime(0, 0, 480, 15), true);
  for (const [week, day, start, duration] of [
    [-1, 0, 600, 60], [52, 0, 600, 60], [0, -1, 600, 60],
    [0, 7, 600, 60], [0, 0.5, 600, 60], [0, 0, 479, 60],
    [0, 0, 1320, 60], [0, 0, 600.5, 60], [0, 0, 1260, 90],
    [0, 0, 480, 0], [0, 0, 480, -1], [0, 0, 480, Number.NaN],
    [0, 0, 480, Infinity],
  ]) assert.equal(isValidSessionTime(week, day, start, duration), false);
});

test('explicit durations survive refresh without course-estimate truncation; completion stays separate', () => {
  const storage = memoryStorage();
  const entries = [session(), session({ id: 'second', day: 1, durationMinutes: 90 })];
  const saved = { signature: 'same', completedIds: [], schedule: entries };
  assert.equal(writePersistedState(saved, storage), true);
  const restored = readPersistedState('same', storage, new Set(['python-video']), new Map([['python-video', 1]])).state;
  assert.deepEqual(restored, saved);
  const removed = { ...restored, schedule: removeSession(restored.schedule, 'first') };
  assert.equal(writePersistedState(removed, storage), true);
  assert.deepEqual(readPersistedState('same', storage).state, removed);
  assert.deepEqual(readPersistedState('different props', storage).state, {
    signature: 'different props', completedIds: [], schedule: [],
  });
});

test('legacy starts migrate deterministically and preserve course completion', () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({
    signature: 'same', completedIds: ['python-video'],
    schedule: [
      { nodeId: 'python-video', day: 0, hour: 14 },
      { nodeId: 'networking-video', day: 6, hour: 20 },
    ],
  }));
  const restored = readPersistedState('same', storage).state;
  assert.equal(restored.schedule.length, 2);
  assert.deepEqual(restored.completedIds, ['python-video']);
  assert.deepEqual(restored.schedule.map(entry => entry.durationMinutes), [60, 60]);
  assert.deepEqual(restored.schedule.map(entry => entry.completed), [true, false]);
  assert.equal(new Set(restored.schedule.map(entry => entry.id)).size, 2);
  assert.deepEqual(readPersistedState('same', storage).state, restored);
  assert.equal(writePersistedState(restored, storage), true);
  assert.deepEqual(readPersistedState('same', storage).state, restored);
});

test('hour-based sessions migrate into minute-based multi-week appointments without changing IDs', () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({
    signature: 'same', completedIds: [],
    schedule: [
      { sessionId: 'saved-first', nodeId: 'python-video', day: 0, hour: 10, durationHours: 1.5 },
      { sessionId: 'saved-second', nodeId: 'python-video', day: 2, hour: 14, durationHours: 2 },
    ],
  }));
  const restored = readPersistedState('same', storage, new Set(['python-video']), new Map([['python-video', 1]])).state;
  assert.deepEqual(restored.schedule, [
    session({ id: 'saved-first', durationMinutes: 90 }),
    session({ id: 'saved-second', day: 2, startMinutes: 840 }),
  ]);
  assert.equal(writePersistedState(restored, storage), true);
  assert.deepEqual(readPersistedState('same', storage).state, restored);
});

test('restoration filters corrupt, stale, duplicate-ID and overlapping sessions independently', () => {
  const storage = memoryStorage();
  const first = session();
  const second = session({ id: 'second', day: 1 });
  storage.setItem(STORAGE_KEY, JSON.stringify({
    signature: 'same', completedIds: ['stale'],
    schedule: [
      null, {}, first, session({ id: 'overlap', startMinutes: 660 }),
      session({ id: 'first', day: 2 }), session({ id: '', day: 3 }),
      session({ id: 'stale', nodeId: 'missing', day: 4 }),
      { ...session({ id: 'bad', day: 5 }), durationMinutes: '60' },
      { nodeId: 'python-video', day: 3, hour: 10, sessionId: 'partial' },
      session({ id: 'late', day: 6, startMinutes: 1260, durationMinutes: 120 }),
      second,
    ],
  }));
  const restored = readPersistedState('same', storage, new Set(['python-video'])).state;
  assert.deepEqual(restored.completedIds, []);
  assert.deepEqual(restored.schedule, [first, second]);
});

test('unavailable or failing storage does not throw', () => {
  const storage = memoryStorage();
  storage.getItem = () => { throw new Error('blocked'); };
  storage.setItem = () => { throw new Error('quota'); };
  assert.equal(readPersistedState('same', storage).available, false);
  assert.equal(writePersistedState({ signature: 'same', completedIds: [], schedule: [] }, storage), false);
});
