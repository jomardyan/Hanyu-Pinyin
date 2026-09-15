import { mergeSettings, type Settings, type DomainRule } from './settings';
export const SETTINGS_KEY = 'hp-settings-v2';
/** Local storage is the source of truth. The worker serializes writes from all extension pages. */
async function request(type: string, payload: Record<string, unknown> = {}): Promise<Settings> {
  const reply = await chrome.runtime.sendMessage({ type, ...payload });
  if (!reply?.ok) throw new Error(reply?.error || 'Could not save extension settings');
  return mergeSettings(reply.settings);
}
export const loadSettings = () => request('hp-settings-get');
export const patchSettings = (patch: Partial<Settings>) => request('hp-settings-patch', { patch });
export const saveSettings = (settings: Settings) => request('hp-settings-replace', { settings });
export const resetSettings = () => request('hp-settings-reset');
export const setDomainRule = (host: string, rule: DomainRule) => request('hp-domain-set', { host, rule });
export function subscribeSettings(listener: (settings: Settings) => void): () => void {
  const callback = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && changes[SETTINGS_KEY]) listener(mergeSettings(changes[SETTINGS_KEY]!.newValue));
  };
  chrome.storage.onChanged.addListener(callback);
  return () => chrome.storage.onChanged.removeListener(callback);
}
