import { loadSettings, saveSettings } from '../shared/storage';

const menus: chrome.contextMenus.CreateProperties[] = [
  { id: 'hp-annotate-selection', title: 'Add Pinyin to selected text', contexts: ['selection'] },
  { id: 'hp-copy-both', title: 'Copy Chinese with Pinyin', contexts: ['selection'] },
  { id: 'hp-copy-pinyin', title: 'Copy Pinyin only', contexts: ['selection'] }
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    for (const item of menus) chrome.contextMenus.create(item);
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  const action = info.menuItemId === 'hp-copy-pinyin' ? 'copy-pinyin' : info.menuItemId === 'hp-copy-both' ? 'copy-both' : 'annotate-selection';
  void chrome.tabs.sendMessage(tab.id, { type: 'hp-selection-action', action }).catch(() => undefined);
});

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

chrome.commands.onCommand.addListener(async command => {
  const tab = await activeTab();
  if (!tab?.id) return;
  const settings = await loadSettings();
  if (command === 'toggle-pinyin') {
    settings.enabled = !settings.enabled;
    await saveSettings(settings);
  } else if (command === 'toggle-hover') {
    settings.annotationMode = settings.annotationMode === 'hover' ? 'above' : 'hover';
    await saveSettings(settings);
  } else if (command === 'annotate-selection') {
    await chrome.tabs.sendMessage(tab.id, { type: 'hp-selection-action', action: 'annotate-selection' }).catch(() => undefined);
  }
});
