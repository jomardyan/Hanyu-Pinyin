import { PageController } from './page-controller';
import { SelectionTool } from './selection-tool';
import { loadSettings, subscribeSettings } from '../shared/storage';

// An isolated-world guard prevents duplicate listeners after manual reinjection.
const world = globalThis as typeof globalThis & { __hanyuReader?: { destroy(): void } };
world.__hanyuReader?.destroy();
const controller = new PageController();
const selection = new SelectionTool(controller);
let alive = true, unsubscribe = () => {}, startupError = '';
const ready = loadSettings().then(settings => {
  if (!alive) return;
  controller.apply(settings);
  unsubscribe = subscribeSettings(next => { selection.hide(); controller.apply(next); });
}).catch(() => { startupError = 'Settings could not be loaded. Reload the extension and page.'; });
const listener: Parameters<typeof chrome.runtime.onMessage.addListener>[0] = (message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  if (!['hp-status', 'hp-reprocess', 'hp-clear-cache', 'hp-selection-action'].includes(message?.type)) return;
  void ready.then(async () => {
    if (startupError) throw new Error(startupError);
    if (message.type === 'hp-reprocess') controller.rescan();
    if (message.type === 'hp-clear-cache') controller.clearCache();
    if (message.type === 'hp-selection-action') await selection.act(message.action, typeof message.text === 'string' ? message.text.slice(0, 10000) : '');
    return { ok: true, ...controller.getState() };
  }).then(sendResponse, error => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Action failed' }));
  return true;
};
chrome.runtime.onMessage.addListener(listener);
const hide = () => { selection.hide(); controller.stop(); };
const show = (event: PageTransitionEvent) => { if (event.persisted) void loadSettings().then(settings => controller.apply(settings)).catch(() => undefined); };
window.addEventListener('pagehide', hide);
window.addEventListener('pageshow', show);
world.__hanyuReader = { destroy() {
  alive = false; unsubscribe(); selection.destroy(); controller.destroy();
  chrome.runtime.onMessage.removeListener(listener); window.removeEventListener('pagehide', hide); window.removeEventListener('pageshow', show);
} };
