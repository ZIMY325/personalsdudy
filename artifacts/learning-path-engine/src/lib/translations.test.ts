import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOCALE_STORAGE_KEY, messages, readLocale, translate, type Locale } from './translations';

test('every interface message has Chinese and Malay copy with matching placeholders', () => {
  assert.equal(new Set(messages.map(([key]) => key)).size, messages.length);
  const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const [key, chinese, malay] of messages) {
    assert.ok(chinese.trim(), key);
    assert.ok(malay.trim(), key);
    assert.deepEqual(placeholders(chinese), placeholders(key), key);
    assert.deepEqual(placeholders(malay), placeholders(key), key);
  }
});

test('switching locales translates tabs, weekday headers and level badges', () => {
  assert.equal(translate('zh-CN', 'Target Job Selection'), '目标岗位选择');
  assert.equal(translate('ms', 'Calendar'), 'Kalendar');
  assert.equal(translate('zh-CN', 'Beginner'), '入门');
  assert.equal(translate('ms', 'Advanced'), 'Lanjutan');
  assert.equal(translate('zh-CN', 'Mon'), '周一');
  assert.equal(translate('ms', 'Monday'), 'Isnin');
  assert.equal(translate('en', 'Learning Path'), 'Learning Path');
});

test('dynamic values stay intact and original course titles are not rewritten', () => {
  for (const locale of ['en', 'zh-CN', 'ms'] as Locale[]) {
    const text = translate(locale, 'Week {week} of {weeks}', { week: 2, weeks: 4 });
    assert.ok(text.includes('2') && text.includes('4'));
    assert.equal(translate(locale, 'HTML — Public provider title'), 'HTML — Public provider title');
  }
});

test('locale preference uses a separate key and falls back safely without storage', () => {
  const visited: string[] = [];
  assert.equal(readLocale({ getItem(key) { visited.push(key); return 'ms'; } }), 'ms');
  assert.deepEqual(visited, [LOCALE_STORAGE_KEY]);
  assert.equal(readLocale({ getItem: () => 'zh-CN' }), 'zh-CN');
  assert.equal(readLocale({ getItem: () => 'invalid' }), 'en');
  assert.equal(readLocale(null), 'en');
  assert.equal(readLocale({ getItem() { throw Error('blocked'); } }), 'en');
});
