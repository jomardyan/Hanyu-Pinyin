import { DEFAULT_SETTINGS, mergeSettings, type Settings } from './settings';

const KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(KEY);
  return mergeSettings(result[KEY] as Partial<Settings> | undefined);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ [KEY]: settings });
}

export async function resetSettings(): Promise<Settings> {
  const value = structuredClone(DEFAULT_SETTINGS);
  await saveSettings(value);
  return value;
}

export function subscribeSettings(listener: (settings: Settings) => void): () => void {
  const callback: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, area) => {
    if (area !== 'sync' || !changes[KEY]) return;
    listener(mergeSettings(changes[KEY].newValue as Partial<Settings> | undefined));
  };
  chrome.storage.onChanged.addListener(callback);
  return () => chrome.storage.onChanged.removeListener(callback);
}
