import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePath, parseSkills, signature, summarize, validateInput } from './engine';
import { careerProfiles, resources } from './resources';
import { readPersistedState, writePersistedState, STORAGE_KEY } from './progress-storage';
import { LEVEL_ORDER } from './course-level';

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
  assert.deepEqual([...new Set(nodes.map(n => n.skill))].sort(), ['Python', 'Networking', 'Google Cloud', 'SQL Injection', 'XSS'].sort());
  assert.equal(nodes.filter(node => node.skill === 'Python').length, 2);
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
  assert.equal(nodes.length, 10);
  assert.deepEqual(summarize(nodes, []), { totalHours: 49, completedHours: 0, completedCount: 0, percentage: 0 });
  assert.deepEqual(summarize(nodes, ['python-video', 'networking-video', 'python-video', 'invalid']),
    { totalHours: 49, completedHours: 16, completedCount: 2, percentage: 33 });
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
    assert.ok(resource.level in LEVEL_ORDER);
    assert.ok(resource.estimatedHours > 0);
    assert.equal(new URL(resource.url).protocol, 'https:');
    if (resource.embedding === 'blocked') assert.equal(resource.embedUrl, null);
    if (resource.kind === 'video') assert.match(resource.embedUrl!, /^https:\/\/www.youtube.com\/embed\/[\w-]+$/);
  }
});

test('each sample occupation has distinct, resource-backed detailed skill gaps', () => {
  assert.ok(careerProfiles.length >= 80);
  assert.equal(new Set(careerProfiles.map(profile => profile.targetRole)).size, careerProfiles.length);
  for (const profile of careerProfiles) {
    assert.ok(profile.skillGaps.length >= 10);
    assert.equal(new Set(profile.skillGaps).size, profile.skillGaps.length);
    for (const { skill, courses } of profile.skills) {
      assert.ok(resources.some(resource => resource.skill.toLowerCase() === skill.toLowerCase()), `${profile.targetRole}: ${skill}`);
      assert.equal(courses.length, 2);
      assert.equal(new Set(courses.map(course => course.url)).size, 2);
    }
    assert.equal(generatePath({ targetRole: profile.targetRole, skillGaps: profile.skillGaps }).length, profile.skillGaps.length * 2);
  }
  assert.deepEqual(generatePath({ targetRole: 'Cybersecurity', skillGaps: ['NETWORK SECURITY', 'linux basics', 'CRYPTOGRAPHY'] }).map(node => node.skill).sort(),
    ['Network Security', 'Network Security', 'Linux Basics', 'Linux Basics', 'Cryptography', 'Cryptography'].sort());
});

test('paths sort by difficulty with stable order and unchanged IDs and state signature', () => {
  const input = { targetRole: 'Engineer', skillGaps: ['Deep Learning', 'React', 'HTML', 'Python', 'CSS'] };
  const before = signature(input);
  const nodes = generatePath(input);
  assert.deepEqual([...new Set(nodes.map(node => node.level))], ['Beginner', 'Intermediate', 'Advanced']);
  assert.ok(nodes.every((node, index) => index === 0 || LEVEL_ORDER[nodes[index - 1]!.level] <= LEVEL_ORDER[node.level]));
  assert.deepEqual(nodes.filter(node => node.level === 'Beginner').map(node => node.skill),
    ['HTML', 'HTML', 'Python', 'CSS', 'CSS']);
  assert.ok(nodes.some(node => node.id === 'python-video'));
  assert.equal(nodes.find(node => node.id === 'python-official')?.level, 'Intermediate');
  assert.equal(signature(input), before);
  assert.equal(generatePath({ targetRole: 'Engineer', skillGaps: ['Unknown skill'] })[0]?.level, 'Beginner');
  for (const profile of careerProfiles) {
    const path = generatePath({ targetRole: profile.targetRole, skillGaps: profile.skillGaps });
    assert.ok(path.every((node, index) => index === 0 || LEVEL_ORDER[path[index - 1]!.level] <= LEVEL_ORDER[node.level]));
  }
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
  storage.setItem(STORAGE_KEY, JSON.stringify(saved)); // Legacy one-hour reminders migrate.
  const validIds = new Set(generatePath(input).map(node => node.id));
  const restored = readPersistedState(signature(input), storage as unknown as Storage, validIds);
  assert.equal(restored.available, true);
  assert.deepEqual(restored.state.completedIds, ['python-video']);
  assert.deepEqual(restored.state.schedule, [{
    id: 'python-video:w0:d0:m840', nodeId: 'python-video', day: 0, week: 0,
    startMinutes: 840, durationMinutes: 60, completed: true,
  }]);
  assert.equal(writePersistedState(restored.state, storage as unknown as Storage), true);
  assert.deepEqual(readPersistedState(signature(input), storage as unknown as Storage).state, restored.state);
  assert.equal(summarize(generatePath(input), restored.state.completedIds).completedHours, 6);
  assert.deepEqual(readPersistedState(signature({ ...input, targetRole: 'Security Engineer' }), storage as unknown as Storage, validIds).state.completedIds, []);
  assert.deepEqual(readPersistedState(signature({ ...input, skillGaps: ['Python'] }), storage as unknown as Storage, validIds).state.schedule, []);
  storage.setItem(STORAGE_KEY, '{bad json');
  assert.deepEqual(readPersistedState(signature(input), storage as unknown as Storage).state.completedIds, []);
  assert.equal(readPersistedState(signature(input), null).available, false);
  assert.equal(writePersistedState(restored.state, null), false);
});
