import { PageController } from './page-controller';
import { SelectionTool } from './selection-tool';
import { loadSettings, subscribeSettings } from '../shared/storage';

// An isolated-world guard prevents duplicate listeners after manual reinjection.
const world = globalThis as typeof globalThis & { __hanyuReader?: { destroy(): void } };
world.__hanyuReader?.destroy();
const controller = new PageController();
const selection = new SelectionTool(controller);
let alive = true, suspended = false, revision = 0, startupError = '';
// Subscribe before loading so a late snapshot cannot overwrite newer changes.
const unsubscribe = subscribeSettings(next => {
  if (!alive) return;
  revision++; startupError = '';
  if (!suspended) { selection.hide(); controller.apply(next); }
});
async function reloadSettings(): Promise<void> {
  const requestRevision = ++revision;
  try {
    const settings = await loadSettings();
    if (!alive || suspended || requestRevision !== revision) return;
    startupError = ''; controller.apply(settings);
  } catch {
    if (alive && !suspended && requestRevision === revision) startupError = 'Settings could not be loaded. Reload the extension and page.';
  }
}
const ready = reloadSettings();
const listener: Parameters<typeof chrome.runtime.onMessage.addListener>[0] = (message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  if (!['hp-status', 'hp-reprocess', 'hp-clear-cache', 'hp-selection-action'].includes(message?.type)) return;
  void ready.then(async () => {
    if (!alive || suspended) throw new Error('The page is no longer active.');
    if (startupError) throw new Error(startupError);
    if (message.type === 'hp-reprocess') controller.rescan();
    if (message.type === 'hp-clear-cache') controller.clearCache();
    if (message.type === 'hp-selection-action') await selection.act(message.action, typeof message.text === 'string' ? message.text.slice(0, 10000) : '');
    return { ok: true, ...controller.getState() };
  }).then(sendResponse, error => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Action failed' }));
  return true;
};
chrome.runtime.onMessage.addListener(listener);
const hide = () => { suspended = true; revision++; selection.hide(); controller.stop(); };
const show = (event: PageTransitionEvent) => {
  if (alive && event.persisted) { suspended = false; void reloadSettings(); }
};
window.addEventListener('pagehide', hide);
window.addEventListener('pageshow', show);
world.__hanyuReader = { destroy() {
  if (!alive) return;
  alive = false; revision++; unsubscribe(); selection.destroy(); controller.destroy();
  chrome.runtime.onMessage.removeListener(listener); window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', show);
} };
