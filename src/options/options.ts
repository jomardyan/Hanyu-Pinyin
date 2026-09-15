import { loadSettings, resetSettings, saveSettings } from '../shared/storage';
import type { Settings } from '../shared/settings';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let settings: Settings;

function render(): void {
  el<HTMLInputElement>('enabled').checked = settings.enabled;
  el<HTMLInputElement>('selectionTool').checked = settings.selectionTool;
  el<HTMLInputElement>('debug').checked = settings.debug;
  el<HTMLInputElement>('batchSize').value = String(settings.batchSize);
  el<HTMLInputElement>('cacheSize').value = String(settings.cacheSize);
  el<HTMLTextAreaElement>('excludedSelectors').value = settings.excludedSelectors.join('\n');
  const rules = el<HTMLDivElement>('rules');
  rules.replaceChildren();
  const entries = Object.entries(settings.domainRules).filter(([, rule]) => rule !== 'inherit');
  if (!entries.length) { rules.textContent = 'No website-specific rules saved.'; return; }
  for (const [host, rule] of entries) {
    const row = document.createElement('div'); row.className = 'rule';
    const name = document.createElement('span'); name.textContent = host;
    const control = document.createElement('select');
    for (const [value, label] of [['always','Always enable'],['never','Never enable'],['inherit','Remove rule']] as const) {
      const option = document.createElement('option'); option.value = value; option.textContent = label; option.selected = value === rule; control.append(option);
    }
    control.addEventListener('change', () => { settings.domainRules[host] = control.value as Settings['domainRules'][string]; });
    row.append(name, control); rules.append(row);
  }
}

async function save(): Promise<void> {
  settings.enabled = el<HTMLInputElement>('enabled').checked;
  settings.selectionTool = el<HTMLInputElement>('selectionTool').checked;
  settings.debug = el<HTMLInputElement>('debug').checked;
  settings.batchSize = Math.min(500, Math.max(10, Number(el<HTMLInputElement>('batchSize').value) || 80));
  settings.cacheSize = Math.min(10000, Math.max(50, Number(el<HTMLInputElement>('cacheSize').value) || 1500));
  settings.excludedSelectors = el<HTMLTextAreaElement>('excludedSelectors').value.split('\n').map(value => value.trim()).filter(Boolean);
  settings.domainRules = Object.fromEntries(Object.entries(settings.domainRules).filter(([, rule]) => rule !== 'inherit'));
  await saveSettings(settings);
  el<HTMLSpanElement>('message').textContent = 'Saved';
  setTimeout(() => { el<HTMLSpanElement>('message').textContent = ''; }, 1200);
}

el<HTMLButtonElement>('save').addEventListener('click', () => void save());
el<HTMLButtonElement>('reset').addEventListener('click', async () => { settings = await resetSettings(); render(); });
void loadSettings().then(value => { settings = value; render(); });
