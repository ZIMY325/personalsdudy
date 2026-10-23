import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePath, parseSkills, signature, summarize, validateInput } from './engine';
import { resources } from './resources';
import { initializeLearningPath, STORAGE_KEY } from '../hooks/use-learning-path';

test('missing fields give messages and never generate a path', () => {
  for (const input of [
    { targetRole: '', skillGaps: [] },
    { targetRole: '  ', skillGaps: ['Python'] },
    { targetRole: 'Engineer', skillGaps: [' ', ''] },
  ]) {
    assert.ok(Object.keys(validateInput(input)).length);
    assert.deepEqual(generatePath(input), []);
  }
});

test('commas, Chinese commas and newlines parse into skills', () => {
  assert.deepEqual(parseSkills(' Python, Networking\nCloud，HTTP\r\n , '), ['Python', 'Networking', 'Cloud', 'HTTP']);
});

test('case-insensitive aliases deduplicate while preserving useful canonical skills', () => {
  const nodes = generatePath({ targetRole: 'Engineer', skillGaps: ['pYtHoN', 'py', 'TCP/IP', 'gcp', 'sqli', '跨站脚本'] });
  assert.deepEqual(nodes.map(n => n.skill), ['Python', 'Networking', 'Google Cloud', 'SQL Injection', 'XSS']);
  assert.equal(nodes.some(n => n.isGuidance), false);
});

test('unknown skills use safely encoded guidance, not a fabricated course', () => {
  const [node] = generatePath({ targetRole: 'Cloud Engineer', skillGaps: ['Kubernetes & ops'] });
  assert.ok(node?.isGuidance);
  assert.equal(node.embedUrl, null);
  const url = new URL(node.url);
  assert.equal(url.hostname, 'www.google.com');
  assert.equal(url.searchParams.get('q'), 'Kubernetes & ops free tutorial Cloud Engineer');
});

test('sample hours and completion percentage, including toggling back', () => {
  const nodes = generatePath({
    targetRole: 'Cloud Security Engineer',
    skillGaps: ['Python', 'Networking', 'Cloud', 'Web Security', 'Kubernetes'],
  });
  assert.equal(nodes.length, 5);
  assert.deepEqual(summarize(nodes, []), { totalHours: 22, completedHours: 0, completedCount: 0, percentage: 0 });
  assert.deepEqual(summarize(nodes, ['python-video', 'networking-video', 'python-video', 'invalid']),
    { totalHours: 22, completedHours: 16, completedCount: 2, percentage: 40 });
  assert.equal(summarize(nodes, nodes.map(n => n.id)).percentage, 100);
  assert.equal(summarize(nodes, ['networking-video']).completedHours, 10);
});

test('normalized state signature is stable, but role or skill changes invalidate it', () => {
  const input = { targetRole: 'Cloud Engineer', skillGaps: ['Python', 'Networking'] };
  const sig = signature(input);
  assert.equal(sig, signature({ targetRole: '  CLOUD   Engineer ', skillGaps: ['tcp/ip', 'py', 'Python'] }));
  assert.notEqual(sig, signature({ ...input, targetRole: 'Security Engineer' }));
  assert.notEqual(sig, signature({ ...input, skillGaps: ['Python'] }));
});

test('catalog has at least 15 typed free resources and distinguishes blocked embeds', () => {
  assert.ok(resources.length >= 15);
  assert.equal(new Set(resources.map(r => r.id)).size, resources.length);
  assert.equal(new Set(resources.map(r => r.category)).size, 4);
  for (const resource of resources) {
    assert.equal(resource.cost, 'Free');
    assert.ok(resource.estimatedHours > 0);
    assert.equal(new URL(resource.url).protocol, 'https:');
    if (resource.embedding === 'blocked') assert.equal(resource.embedUrl, null);
    if (resource.kind === 'video') assert.match(resource.embedUrl!, /^https:\/\/www.youtube.com\/embed\/[\w-]+$/);
  }
});

test('refresh restores matching saved completion and filters stale node IDs', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });
  const input = { targetRole: 'Engineer', skillGaps: ['Python', 'Networking'] };
  const saved = {
    targetRole: input.targetRole, skillsText: input.skillGaps.join(','),
    signature: signature(input), completedIds: ['python-video', 'invalid', 'python-video'],
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(saved));
  const restored = initializeLearningPath();
  assert.equal(restored.storageAvailable, true);
  assert.deepEqual(restored.completion.ids, ['python-video']);
  assert.equal(summarize(generatePath(input), restored.completion.ids).completedHours, 6);
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, targetRole: 'Different role' }));
  assert.deepEqual(initializeLearningPath().completion.ids, []);
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, skillsText: 'Cloud' }));
  assert.deepEqual(initializeLearningPath().completion.ids, []);
  storage.setItem(STORAGE_KEY, '{bad json');
  assert.deepEqual(initializeLearningPath().completion.ids, []);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    get localStorage() { throw new Error('Storage denied'); },
  } });
  const unavailable = initializeLearningPath();
  assert.equal(unavailable.storageAvailable, false);
  assert.deepEqual(unavailable.completion.ids, []);
  Reflect.deleteProperty(globalThis, 'window');
});
