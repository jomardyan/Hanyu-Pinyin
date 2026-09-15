import { loadSettings, resetSettings, saveSettings } from '../shared/storage';
import type { Settings, DomainRule } from '../shared/settings';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const enabled = byId<HTMLInputElement>('enabled');
const annotationMode = byId<HTMLSelectElement>('annotationMode');
const granularity = byId<HTMLSelectElement>('granularity');
const toneStyle = byId<HTMLSelectElement>('toneStyle');
const domainRule = byId<HTMLSelectElement>('domainRule');
const fontScale = byId<HTMLInputElement>('fontScale');
const opacity = byId<HTMLInputElement>('opacity');
const spacing = byId<HTMLInputElement>('spacing');
const color = byId<HTMLInputElement>('color');
const status = byId<HTMLDivElement>('status');
const site = byId<HTMLParagraphElement>('site');
let settings: Settings;
let host = '';
let tabId: number | undefined;

function render(): void {
  enabled.checked = settings.enabled;
  annotationMode.value = settings.annotationMode;
  granularity.value = settings.granularity;
  toneStyle.value = settings.toneStyle;
  domainRule.value = settings.domainRules[host] ?? 'inherit';
  fontScale.value = String(settings.fontScale);
  opacity.value = String(settings.opacity);
  spacing.value = String(settings.spacing);
  color.value = settings.color;
}

async function persist(): Promise<void> {
  settings.enabled = enabled.checked;
  settings.annotationMode = annotationMode.value as Settings['annotationMode'];
  settings.granularity = granularity.value as Settings['granularity'];
  settings.toneStyle = toneStyle.value as Settings['toneStyle'];
  settings.fontScale = Number(fontScale.value);
  settings.opacity = Number(opacity.value);
  settings.spacing = Number(spacing.value);
  settings.color = color.value;
  if (host) settings.domainRules[host] = domainRule.value as DomainRule;
  await saveSettings(settings);
  if (tabId) void chrome.tabs.sendMessage(tabId, { type: 'hp-reprocess' }).catch(() => undefined);
}

for (const control of [enabled, annotationMode, granularity, toneStyle, domainRule, fontScale, opacity, spacing, color]) {
  control.addEventListener('change', () => void persist());
  if (control.type === 'range' || control.type === 'color') control.addEventListener('input', () => void persist());
}

byId<HTMLButtonElement>('defaults').addEventListener('click', async () => { settings = await resetSettings(); render(); await persist(); });
byId<HTMLButtonElement>('options').addEventListener('click', () => chrome.runtime.openOptionsPage());

void (async () => {
  settings = await loadSettings();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id;
  try { host = tab?.url ? new URL(tab.url).hostname : ''; } catch { host = ''; }
  site.textContent = host || 'This page';
  render();
  if (!tabId) return;
  try {
    const reply = await chrome.tabs.sendMessage(tabId, { type: 'hp-status' });
    status.textContent = `${reply.enabled ? 'Active' : 'Inactive'} · ${reply.stats.processedNodes} text segments processed`;
  } catch {
    status.textContent = 'Unavailable on this browser page';
  }
})();
