import { loadSettings, patchSettings, setDomainRule, subscribeSettings } from '../shared/storage';
import { DEFAULT_SETTINGS, isEnabledForHost, ruleForHost, type Settings, type DomainRule } from '../shared/settings';
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let settings: Settings, host = '', tabId: number | undefined, requestId = 0, ready = false;
const appearance = ['fontScale', 'opacity', 'spacing', 'color'] as const;
const names = ['annotationMode', 'granularity', 'toneStyle', ...appearance] as const;
const status = el<HTMLParagraphElement>('status');
function error(message: string) { status.textContent = message; status.classList.add('error'); }
function outputs() {
  for (const name of ['fontScale', 'opacity', 'spacing']) el<HTMLOutputElement>(name + 'Value').value = el<HTMLInputElement>(name).value;
}
function render() {
  for (const name of names) el<HTMLInputElement>(name).value = String(settings[name]);
  el<HTMLInputElement>('enabled').checked = host ? isEnabledForHost(settings, host) : false;
  el<HTMLSelectElement>('domainRule').value = ruleForHost(settings, host);
  el<HTMLInputElement>('enabled').disabled = !host;
  el<HTMLSelectElement>('domainRule').disabled = !host; outputs();
}
async function pageAction(type: string) {
  if (tabId === undefined) throw new Error('No active tab');
  const result = await chrome.tabs.sendMessage(tabId, { type }, { frameId: 0 });
  if (!result?.ok) throw new Error(result?.error || 'No response from page');
  return result;
}
async function refresh() {
  if (!host) { status.textContent = 'This browser page cannot be annotated.'; return; }
  try {
    const state = await pageAction('hp-status'); status.classList.remove('error');
    status.textContent = `${state.enabled ? 'Active' : 'Paused'} · ${state.stats.processedSegments} segments processed${state.stats.pending ? ' · Processing' : ''}${state.stats.errors ? ' · Some text could not be converted' : ''}`;
  } catch { error('Reload this tab to connect the extension. Protected pages are not supported.'); }
}
async function save(operation: () => Promise<Settings>) {
  if (!ready) return;
  const id = ++requestId;
  try { const result = await operation(); if (id === requestId) { settings = result; render(); await refresh(); } }
  catch (e) { error(e instanceof Error ? e.message : 'Settings could not be saved'); }
}
for (const name of names) {
  const control = el<HTMLInputElement>(name);
  control.addEventListener('input', outputs);
  control.addEventListener('change', () => {
    const value = ['fontScale', 'opacity', 'spacing'].includes(name) ? Number(control.value) : control.value;
    void save(() => patchSettings({ [name]: value }));
  });
}
el<HTMLInputElement>('enabled').addEventListener('change', () => void save(() => setDomainRule(host, el<HTMLInputElement>('enabled').checked ? 'always' : 'never')));
el<HTMLSelectElement>('domainRule').addEventListener('change', () => void save(() => setDomainRule(host, el<HTMLSelectElement>('domainRule').value as DomainRule)));
// Reset only the controls inside the Appearance section, not placement, unit, or tones.
el('defaults').addEventListener('click', () => void save(() => patchSettings(Object.fromEntries(appearance.map(name => [name, DEFAULT_SETTINGS[name]])))));
el('options').addEventListener('click', () => void chrome.runtime.openOptionsPage());
for (const [id, type] of [['rescan', 'hp-reprocess'], ['clearCache', 'hp-clear-cache']]) el(id!).addEventListener('click', () => void pageAction(type!).then(refresh).catch(() => error('Reload the tab and try again.')));
void (async () => {
  try {
    settings = await loadSettings();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); tabId = tab?.id;
    try { const url = new URL(tab?.url || ''); if (/^https?:$/.test(url.protocol)) host = url.hostname; } catch { /* protected tab */ }
    el('site').textContent = host || 'Browser page';
    render(); el<HTMLFieldSetElement>('controls').disabled = false; ready = true;
    const unsubscribe = subscribeSettings(next => { settings = next; render(); void refresh(); });
    const interval = window.setInterval(() => void refresh(), 1200);
    window.addEventListener('pagehide', () => { unsubscribe(); clearInterval(interval); }, { once: true });
    await refresh();
  } catch { error('Settings are unavailable. Reload the extension.'); }
})();
