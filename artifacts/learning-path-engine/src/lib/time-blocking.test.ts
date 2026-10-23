import assert from 'node:assert/strict';
import { test } from 'node:test';
import { courseProgress, formatTime, planCourse, type StudySession } from './time-blocking';
import { readPersistedState, writePersistedState } from './progress-storage';

test('4 hours splits into four real one-hour sessions, preserving total minutes', () => {
  const result = planCourse('html', 4, [], 0, 18 * 60, 1);
  assert.ok(result.ok);
  assert.equal(result.sessions.length, 4);
  assert.deepEqual(result.sessions.map(session => session.day), [0, 1, 2, 3]);
  assert.ok(result.sessions.every(session => session.startMinutes === 1080 && session.durationMinutes === 60));
  assert.equal(result.sessions.reduce((sum, session) => sum + session.durationMinutes, 0), 240);
  assert.equal(formatTime(result.sessions[0]!.startMinutes + result.sessions[0]!.durationMinutes), '19:00');
});

test('non-divisible hours produce an exact shorter final block', () => {
  const result = planCourse('analysis', 4.5, [], 0, 1080, 2);
  assert.ok(result.ok);
  assert.deepEqual(result.sessions.map(session => session.durationMinutes), [120, 120, 30]);
});

test('sessions span weeks without losing or overallocating course time', () => {
  const result = planCourse('long', 10, [], 5, 1080, 1);
  assert.ok(result.ok);
  assert.equal(result.sessions.length, 10);
  assert.deepEqual(result.sessions.slice(0, 3).map(session => [session.week, session.day]), [[0, 5], [0, 6], [1, 0]]);
  assert.equal(result.sessions.reduce((sum, session) => sum + session.durationMinutes, 0), 600);
});

test('partially overlapping slots skip occupied days; adjacent slots remain valid', () => {
  const occupied: StudySession = { id: 'busy', nodeId: 'other', day: 0, week: 0, startMinutes: 1110, durationMinutes: 60, completed: false };
  const result = planCourse('html', 4, [occupied], 0, 1080, 1);
  assert.ok(result.ok);
  assert.equal(result.sessions.find(session => session.nodeId === 'html')?.day, 1);
  assert.equal(result.sessions.filter(session => session.nodeId === 'other').length, 1);
  const adjacent = planCourse('html', 1, [{ ...occupied, startMinutes: 1020 }], 0, 1080, 1);
  assert.ok(adjacent.ok);
  assert.equal(adjacent.sessions[1]!.day, 0);
});

test('invalid or overnight plans fail atomically without modifying existing sessions', () => {
  const existing: StudySession[] = [];
  for (const [day, start, hours] of [[7, 1080, 1], [0, 1320, 1], [0, 1260, 2], [0, 1080, 0], [0, 1080, 0.3], [0, 1081, 1]]) {
    assert.equal(planCourse('html', 4, existing, day!, start!, hours!).ok, false);
    assert.deepEqual(existing, []);
  }
});

test('finished blocks drive partial/full course progress; replanning preserves finished study', () => {
  const initial = planCourse('html', 4, [], 0, 1080, 1);
  assert.ok(initial.ok);
  const sessions = initial.sessions.map((session, index) => ({ ...session, completed: index === 0 }));
  assert.deepEqual(courseProgress('html', 4, sessions, false), { totalHours: 4, completedHours: 1, percentage: 25 });
  const replanned = planCourse('html', 4, sessions, 0, 1080, 2);
  assert.ok(replanned.ok);
  assert.equal(replanned.sessions.reduce((sum, session) => sum + session.durationMinutes, 0), 240);
  assert.deepEqual(replanned.sessions.map(session => session.durationMinutes), [60, 120, 60]);
  assert.deepEqual(courseProgress('html', 4, sessions.map(session => ({ ...session, completed: true })), false),
    { totalHours: 4, completedHours: 4, percentage: 100 });
  assert.equal(courseProgress('html', 4, sessions, true).completedHours, 4);
});

test('real session durations and finished flags survive storage and input changes reset', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } } as unknown as Storage;
  const result = planCourse('html', 4, [], 0, 1080, 1);
  assert.ok(result.ok);
  result.sessions[0]!.completed = true;
  const state = { signature: 'same', completedIds: [], schedule: result.sessions };
  assert.equal(writePersistedState(state, storage), true);
  assert.deepEqual(readPersistedState('same', storage, new Set(['html'])).state, state);
  assert.equal(readPersistedState('different', storage).state.schedule.length, 0);
  const throwingStorage = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } } as unknown as Storage;
  assert.equal(readPersistedState('same', throwingStorage).available, false);
  assert.equal(writePersistedState(state, throwingStorage), false);
});

test('legacy reminders cannot allocate more than the actual course hours', () => {
  const storage = { getItem: () => JSON.stringify({ signature: 'legacy', completedIds: ['dns'],
    schedule: [{ nodeId: 'dns', day: 0, hour: 18 }] }) } as unknown as Storage;
  const loaded = readPersistedState('legacy', storage, new Set(['dns']), new Map([['dns', 0.5]]));
  assert.equal(loaded.state.schedule[0]!.durationMinutes, 30);
  assert.equal(loaded.state.schedule[0]!.completed, true);
});
