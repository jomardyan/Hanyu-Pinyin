import { loadSettings, patchSettings, resetSettings, saveSettings, setDomainRule } from '../shared/storage';
import { canonicalHost, mergeSettings, type DomainRule, type Settings } from '../shared/settings';
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let settings: Settings;
const booleanFields = ['enabled', 'selectionTool', 'processNonChinese', 'debug'] as const;
const numericFields = ['fontScale', 'opacity', 'spacing', 'batchSize', 'cacheSize'] as const;
const selectFields = ['annotationMode', 'granularity', 'toneStyle', 'color'] as const;
function notice(text: string, error = false) { const m = el('message'); m.textContent = text; m.classList.toggle('error', error); }
async function guard(operation: () => Promise<void>) { try { await operation(); } catch (e) { notice(e instanceof Error ? e.message : 'Operation failed', true); } }
function render() {
  for (const name of booleanFields) el<HTMLInputElement>(name).checked = settings[name];
  for (const name of [...numericFields, ...selectFields]) el<HTMLInputElement>(name).value = String(settings[name]);
  el<HTMLTextAreaElement>('excludedSelectors').value = settings.excludedSelectors.join('\n'); renderRules();
}
function renderRules() {
  const rules = el('rules'); rules.replaceChildren();
  for (const [host, rule] of Object.entries(settings.domainRules).sort(([a], [b]) => a.localeCompare(b))) {
    const row = document.createElement('div'); row.className = 'rule';
    const text = document.createElement('span'); text.textContent = host;
    const select = document.createElement('select'); select.setAttribute('aria-label', `Rule for ${host}`);
    for (const [value, label] of [['always', 'Always enable'], ['never', 'Never enable'], ['inherit', 'Remove rule']]) {
      const option = document.createElement('option'); option.value = value!; option.textContent = label!; select.append(option);
    }
    select.value = rule;
    select.addEventListener('change', () => void guard(async () => {
      settings = await setDomainRule(host, select.value as DomainRule); renderRules(); notice('Website rule saved');
    })); row.append(text, select); rules.append(row);
  }
  if (!rules.childNodes.length) rules.textContent = 'No website rules saved.';
}
function validateSelectors(values: string[]) { for (const value of values) { try { document.querySelector(value); } catch { throw new Error(`Invalid CSS selector - ${value.slice(0, 100)}`); } } }
el('save').addEventListener('click', () => void guard(async () => {
  const patch: Record<string, unknown> = {};
  for (const name of booleanFields) patch[name] = el<HTMLInputElement>(name).checked;
  for (const name of numericFields) {
    const control = el<HTMLInputElement>(name); if (!control.checkValidity() || !control.value) throw new Error(`Check the value for ${name}`);
    patch[name] = Number(control.value);
  }
  for (const name of selectFields) patch[name] = el<HTMLInputElement>(name).value;
  const selectors = el<HTMLTextAreaElement>('excludedSelectors').value.split('\n').map(s => s.trim()).filter(Boolean);
  if (selectors.length > 50 || selectors.some(s => s.length > 512)) throw new Error('Use at most 50 selectors, each up to 512 characters');
  validateSelectors(selectors); patch.excludedSelectors = selectors;
  settings = await patchSettings(patch); render(); notice('Preferences saved');
}));
el('addRule').addEventListener('click', () => void guard(async () => {
  const host = canonicalHost(el<HTMLInputElement>('newHost').value); if (!host) throw new Error('Enter a hostname without a path, port, or protocol');
  settings = await setDomainRule(host, el<HTMLSelectElement>('newRule').value as DomainRule);
  el<HTMLInputElement>('newHost').value = ''; renderRules(); notice('Website rule saved');
}));
el('reset').addEventListener('click', () => void guard(async () => {
  if (!confirm('Reset all preferences and website rules?')) return;
  settings = await resetSettings(); render(); notice('All settings reset');
}));
el('export').addEventListener('click', () => void guard(async () => {
  const latest = await loadSettings();
  const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'hanyu-pinyin-settings', version: 1, settings: latest }, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'hanyu-pinyin-settings.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); notice('Saved settings exported');
}));
el<HTMLInputElement>('import').addEventListener('change', () => void guard(async () => {
  const control = el<HTMLInputElement>('import'), file = control.files?.[0]; control.value = '';
  if (!file) return; if (file.size > 100000) throw new Error('Settings file is too large');
  const value = JSON.parse(await file.text());
  if (value?.format !== 'hanyu-pinyin-settings' || value.version !== 1 || !value.settings || typeof value.settings !== 'object') throw new Error('Not a supported Hanyu Pinyin settings file');
  const next = mergeSettings(value.settings); validateSelectors(next.excludedSelectors);
  if (!confirm('Replace all saved preferences and website rules with this file?')) return;
  settings = await saveSettings(next); render(); notice('Settings imported');
}));
// Shown to users, so it is read from the manifest rather than duplicated in the page.
try { el('version').textContent = chrome.runtime.getManifest().version; } catch { el('version').textContent = 'unknown'; }
void guard(async () => { settings = await loadSettings(); render(); el<HTMLFieldSetElement>('controls').disabled = false; notice(''); });
