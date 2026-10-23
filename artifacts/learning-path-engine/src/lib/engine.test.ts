import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePath, parseSkills, signature, summarize, validateInput } from './engine';
import { careerProfiles, resources } from './resources';
import { readPersistedState, writePersistedState, STORAGE_KEY } from './progress-storage';

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
  assert.equal(new Set(resources.map(r => r.category)).size, 9);
  for (const resource of resources) {
    assert.equal(resource.cost, 'Free');
    assert.ok(resource.estimatedHours > 0);
    assert.equal(new URL(resource.url).protocol, 'https:');
    if (resource.embedding === 'blocked') assert.equal(resource.embedUrl, null);
    if (resource.kind === 'video') assert.match(resource.embedUrl!, /^https:\/\/www.youtube.com\/embed\/[\w-]+$/);
  }
});

test('each sample occupation has distinct, resource-backed detailed skill gaps', () => {
  assert.ok(careerProfiles.length >= 5);
  for (const profile of careerProfiles) {
    assert.ok(profile.skillGaps.length >= 4);
    for (const skill of profile.skillGaps) {
      assert.ok(resources.some(resource => resource.skill.toLowerCase() === skill.toLowerCase()), `${profile.targetRole}: ${skill}`);
    }
  }
  assert.deepEqual(generatePath({ targetRole: 'Cybersecurity', skillGaps: ['NETWORK SECURITY', 'linux basics', 'CRYPTOGRAPHY'] }).map(node => node.skill),
    ['Network Security', 'Linux Basics', 'Cryptography']);
});

test('refresh restores matching completion and schedule, and input signatures clear both', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const input = { targetRole: 'Engineer', skillGaps: ['Python', 'Networking'] };
  const saved = {
    signature: signature(input), completedIds: ['python-video', 'invalid', 'python-video'],
    schedule: [{ nodeId: 'python-video', day: 0, hour: 14 }, { nodeId: 'invalid', day: 7, hour: 30 }],
  };
  assert.equal(writePersistedState(saved, storage as unknown as Storage), true);
  const validIds = new Set(generatePath(input).map(node => node.id));
  const restored = readPersistedState(signature(input), storage as unknown as Storage, validIds);
  assert.equal(restored.available, true);
  assert.deepEqual(restored.state.completedIds, ['python-video']);
  assert.deepEqual(restored.state.schedule, [{ nodeId: 'python-video', day: 0, hour: 14 }]);
  assert.equal(summarize(generatePath(input), restored.state.completedIds).completedHours, 6);
  assert.deepEqual(readPersistedState(signature({ ...input, targetRole: 'Security Engineer' }), storage as unknown as Storage, validIds).state.completedIds, []);
  assert.deepEqual(readPersistedState(signature({ ...input, skillGaps: ['Python'] }), storage as unknown as Storage, validIds).state.schedule, []);
  storage.setItem(STORAGE_KEY, '{bad json');
  assert.deepEqual(readPersistedState(signature(input), storage as unknown as Storage).state.completedIds, []);
  assert.equal(readPersistedState(signature(input), null).available, false);
  assert.equal(writePersistedState(saved, null), false);
});
