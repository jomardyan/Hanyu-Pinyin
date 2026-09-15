import { canonicalHost, isEnabledForHost, mergeSettings, type Settings } from '../shared/settings';
import { SETTINGS_KEY } from '../shared/storage';
let writeQueue: Promise<unknown> = Promise.resolve();
async function read(): Promise<Settings> {
  const current = await chrome.storage.local.get(SETTINGS_KEY);
  if (Object.hasOwn(current, SETTINGS_KEY)) return mergeSettings(current[SETTINGS_KEY]);
  // Migrate once. Do not delete the older sync record in case the user rolls back.
  let old: unknown;
  try { old = (await chrome.storage.sync.get('settings')).settings; } catch { old = undefined; }
  const settings = mergeSettings(old);
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  return settings;
}
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation); writeQueue = next.catch(() => undefined); return next;
}
function hostOf(url?: string): string {
  try { const u = new URL(url || ''); return /^https?:$/.test(u.protocol) ? canonicalHost(u.hostname) : ''; } catch { return ''; }
}
const actions = new Map([
  ['hp-annotate-selection', ['Add Pinyin to selection', 'annotate-selection']],
  ['hp-remove-selection', ['Remove Pinyin from selection', 'remove-selection']],
  ['hp-copy-both', ['Copy Chinese with Pinyin', 'copy-both']],
  ['hp-copy-pinyin', ['Copy Pinyin only', 'copy-pinyin']]
]);
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    for (const [id, [title]] of actions) chrome.contextMenus.create({ id, title: title!, contexts: ['selection'], documentUrlPatterns: ['http://*/*', 'https://*/*'] });
  });
  void serial(read).catch(() => undefined);
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const action = actions.get(String(info.menuItemId))?.[1];
  if (tab?.id === undefined || !action) return;
  void chrome.tabs.sendMessage(tab.id, { type: 'hp-selection-action', action, text: (info.selectionText || '').slice(0, 10000) }, { frameId: info.frameId ?? 0 }).catch(() => undefined);
});
const settingMessages = new Set(['hp-settings-get', 'hp-settings-patch', 'hp-settings-replace', 'hp-settings-reset', 'hp-domain-set']);
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !settingMessages.has(message?.type)) return;
  void serial(async () => {
    let settings = await read();
    if (message.type === 'hp-settings-get') return settings;
    if (message.type === 'hp-settings-reset') settings = mergeSettings(undefined);
    if (message.type === 'hp-settings-replace') settings = mergeSettings(message.settings);
    if (message.type === 'hp-settings-patch') {
      const patch = message.patch;
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Invalid settings');
      // Whole-domain replacement belongs to explicit import. Normal UI saves cannot erase other tabs\' rules.
      const { domainRules: _ignored, ...safe } = patch;
      settings = mergeSettings({ ...settings, ...safe });
    }
    if (message.type === 'hp-domain-set') {
      const host = canonicalHost(message.host), rule = message.rule;
      if (!host || !['inherit', 'always', 'never'].includes(rule)) throw new Error('Invalid website rule');
      if (rule === 'inherit') delete settings.domainRules[host];
      else {
        if (!Object.hasOwn(settings.domainRules, host) && Object.keys(settings.domainRules).length >= 500) throw new Error('Remove an unused website rule before adding another');
        settings.domainRules[host] = rule;
      }
    }
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings }); return settings;
  }).then(settings => sendResponse({ ok: true, settings }), () => sendResponse({ ok: false, error: 'Settings could not be saved. Check the values and available browser storage.' }));
  return true;
});
chrome.commands.onCommand.addListener(command => {
  void (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) return;
    if (command === 'annotate-selection') {
      await chrome.tabs.sendMessage(tab.id, { type: 'hp-selection-action', action: command }).catch(() => undefined); return;
    }
    await serial(async () => {
      const settings = await read(), host = hostOf(tab.url);
      if (command === 'toggle-pinyin') {
        if (!host) return;
        settings.domainRules[host] = isEnabledForHost(settings, host) ? 'never' : 'always';
      } else if (command === 'toggle-hover') settings.annotationMode = settings.annotationMode === 'hover' ? 'above' : 'hover';
      else return;
      await chrome.storage.local.set({ [SETTINGS_KEY]: mergeSettings(settings) });
    });
  })().catch(() => undefined);
});
