const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(process.env.HP_EXTENSION_DIR || path.join(__dirname, '../dist'), 'background.js'), 'utf8');
function harness(initialLocal = {}, initialSync = {}) {
  const local = structuredClone(initialLocal), sync = structuredClone(initialSync), messages = [], changes = [], menus = [], sent = [];
  let installed, command, contextMenu, failWrite = false;
  const makeArea = (values, name) => ({
    async get(key) { await new Promise(r => setTimeout(r, 1)); return Object.hasOwn(values, key) ? { [key]: structuredClone(values[key]) } : {}; },
    async set(data) {
      if (failWrite) { failWrite = false; throw Error('Injected write error'); }
      await new Promise(r => setTimeout(r, 1));
      const record = {};
      for (const [key, value] of Object.entries(data)) { record[key] = { oldValue: values[key], newValue: structuredClone(value) }; values[key] = structuredClone(value); }
      for (const listener of changes) listener(record, name);
    }
  });
  const chrome = { runtime: { id: 'test-extension', onInstalled: { addListener(fn) { installed = fn; } }, onMessage: { addListener(fn) { messages.push(fn); } } },
    storage: { local: makeArea(local, 'local'), sync: makeArea(sync, 'sync'), onChanged: { addListener(fn) { changes.push(fn); } } },
    contextMenus: { removeAll(fn) { fn(); }, create(menu) { menus.push(menu); }, onClicked: { addListener(fn) { contextMenu = fn; } } },
    tabs: { async query() { return [{ id: 7, url: 'https://example.com/article' }]; }, async sendMessage(...args) { sent.push(args); return {}; } },
    commands: { onCommand: { addListener(fn) { command = fn; } } } };
  vm.runInNewContext(source, { chrome, URL, console, Object, Promise, setTimeout });
  const send = message => new Promise((done, fail) => {
    const timer = setTimeout(() => fail(Error('Missing message response')), 1000);
    const reply = value => { clearTimeout(timer); done(JSON.parse(JSON.stringify(value))); };
    for (const fn of messages) fn(message, { id: chrome.runtime.id }, reply);
  });
  return { send, local, sync, menus, sent, install: () => installed(), command: name => command(name), click: (info, tab) => contextMenu(info, tab), failNextWrite() { failWrite = true; } };
}
test('defaults load and persist in local storage', async () => {
  const h = harness(), result = await h.send({ type: 'hp-settings-get' });
  assert.equal(result.ok, true); assert.equal(result.settings.enabled, true); assert.ok(h.local['hp-settings-v2']);
});
test('legacy sync settings migrate without overwriting existing local preferences', async () => {
  const h = harness({}, { settings: { enabled: false, fontScale: .75 } });
  assert.equal((await h.send({ type: 'hp-settings-get' })).settings.fontScale, .75);
  h.sync.settings.fontScale = .9;
  assert.equal((await h.send({ type: 'hp-settings-get' })).settings.fontScale, .75);
});
test('parallel patches and domain writes do not lose updates', async () => {
  const h = harness();
  await Promise.all([
    h.send({ type: 'hp-settings-patch', patch: { fontScale: .7 } }),
    h.send({ type: 'hp-settings-patch', patch: { toneStyle: 'numbers' } }),
    h.send({ type: 'hp-domain-set', host: 'Example.com.', rule: 'never' })
  ]);
  const s = (await h.send({ type: 'hp-settings-get' })).settings;
  assert.equal(s.fontScale, .7); assert.equal(s.toneStyle, 'numbers'); assert.equal(s.domainRules['example.com'], 'never');
});
test('invalid values are normalized and CSS cannot be injected', async () => {
  const h = harness();
  const result = await h.send({ type: 'hp-settings-patch', patch: { color: 'red;}body{display:none}', batchSize: NaN, cacheSize: Infinity, opacity: 99 } });
  assert.equal(result.settings.color, '#5b6472'); assert.equal(result.settings.batchSize, 80); assert.equal(result.settings.opacity, 1);
});
test('invalid domains and malformed patches fail without terminating the queue', async () => {
  const h = harness();
  assert.equal((await h.send({ type: 'hp-domain-set', host: 'https://evil.com/path', rule: 'always' })).ok, false);
  assert.equal((await h.send({ type: 'hp-settings-patch', patch: [] })).ok, false);
  assert.equal((await h.send({ type: 'hp-settings-patch', patch: { enabled: false } })).settings.enabled, false);
});
test('whole settings replacement is sanitized against prototype keys', async () => {
  const h = harness();
  const value = JSON.parse('{"domainRules":{"__proto__":"always","constructor":"always","example.com":"never"}}');
  const s = (await h.send({ type: 'hp-settings-replace', settings: value })).settings;
  assert.deepEqual(Object.keys(s.domainRules), ['example.com']);
});
test('ordinary UI patches cannot overwrite other tabs domain rules', async () => {
  const h = harness(); await h.send({ type: 'hp-domain-set', host: 'example.com', rule: 'never' });
  const s = (await h.send({ type: 'hp-settings-patch', patch: { domainRules: {}, color: '#abcdef' } })).settings;
  assert.equal(s.domainRules['example.com'], 'never'); assert.equal(s.color, '#abcdef');
});
test('reset removes domain rules and restores defaults', async () => {
  const h = harness(); await h.send({ type: 'hp-domain-set', host: 'example.com', rule: 'never' });
  const s = (await h.send({ type: 'hp-settings-reset' })).settings;
  assert.deepEqual(s.domainRules, {}); assert.equal(s.enabled, true);
});
test('storage failures return a response and subsequent saves still work', async () => {
  const h = harness(); await h.send({ type: 'hp-settings-get' }); h.failNextWrite();
  assert.equal((await h.send({ type: 'hp-settings-patch', patch: { fontScale: .8 } })).ok, false);
  assert.equal((await h.send({ type: 'hp-settings-patch', patch: { fontScale: .9 } })).settings.fontScale, .9);
});
test('context actions are installed and routed to the clicked frame', async () => {
  const h = harness(); h.install(); assert.equal(h.menus.length, 4);
  h.click({ menuItemId: 'hp-remove-selection', frameId: 3, selectionText: '中文' }, { id: 7 });
  await new Promise(r => setTimeout(r, 10));
  assert.equal(h.sent[0][0], 7); assert.equal(h.sent[0][1].action, 'remove-selection'); assert.equal(h.sent[0][2].frameId, 3);
});
test('toggle shortcut updates the current website rather than all websites', async () => {
  const h = harness(); await h.send({ type: 'hp-settings-get' }); h.command('toggle-pinyin');
  await new Promise(r => setTimeout(r, 20));
  const s = (await h.send({ type: 'hp-settings-get' })).settings;
  assert.equal(s.enabled, true); assert.equal(s.domainRules['example.com'], 'never');
});
