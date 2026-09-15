export type ToneStyle = 'marks' | 'numbers' | 'none';
export type AnnotationMode = 'above' | 'after' | 'hover' | 'hidden';
export type Granularity = 'word' | 'character';
export type DomainRule = 'inherit' | 'always' | 'never';
export interface Settings {
  enabled: boolean; annotationMode: AnnotationMode; granularity: Granularity;
  toneStyle: ToneStyle; fontScale: number; opacity: number; spacing: number;
  color: string; selectionTool: boolean; debug: boolean; batchSize: number;
  cacheSize: number; processNonChinese: boolean;
  excludedSelectors: string[]; domainRules: Record<string, DomainRule>;
}
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  enabled: true, annotationMode: 'above', granularity: 'word', toneStyle: 'marks',
  fontScale: 0.5, opacity: 0.9, spacing: 0, color: '#5b6472',
  selectionTool: true, debug: false, batchSize: 80, cacheSize: 1500,
  processNonChinese: false, excludedSelectors: [], domainRules: {}
});
export const MAX_RULES = 500;
export const MAX_SELECTORS = 50;
const reserved = new Set(['__proto__', 'prototype', 'constructor']);
export function canonicalHost(value: unknown): string {
  if (typeof value !== 'string') return '';
  const host = value.trim().toLowerCase().replace(/\.$/, '');
  if ((host.includes(':') && !/^\[[0-9a-f:.]+\]$/.test(host)) || !host || host.length > 253 || reserved.has(host) || /[\s/@?#\\]/u.test(host)) return '';
  try {
    const url = new URL(`https://${host}`);
    if (url.port || url.pathname !== '/' || url.username || url.password) return '';
    if (!url.hostname.startsWith('[') && !url.hostname.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return '';
    return url.hostname;
  } catch { return ''; }
}
const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const num = (v: unknown, fallback: number, low: number, high: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(high, Math.max(low, v)) : fallback;
export function mergeSettings(value: unknown): Settings {
  const v = record(value), d = DEFAULT_SETTINGS;
  const bool = (k: keyof Settings) => typeof v[k] === 'boolean' ? v[k] as boolean : d[k] as boolean;
  const choice = <T extends string>(k: string, allowed: T[], fallback: T): T =>
    allowed.includes(v[k] as T) ? v[k] as T : fallback;
  const domainRules: Record<string, DomainRule> = Object.create(null);
  for (const [raw, rule] of Object.entries(record(v.domainRules)).slice(0, MAX_RULES)) {
    const host = canonicalHost(raw);
    if (host && (rule === 'always' || rule === 'never')) domainRules[host] = rule;
  }
  const excludedSelectors = Array.isArray(v.excludedSelectors)
    ? [...new Set(v.excludedSelectors.filter((s): s is string => typeof s === 'string')
      .map(s => s.trim()).filter(s => s.length > 0 && s.length <= 512))].slice(0, MAX_SELECTORS) : [];
  return {
    enabled: bool('enabled'), selectionTool: bool('selectionTool'), debug: bool('debug'),
    processNonChinese: bool('processNonChinese'),
    annotationMode: choice('annotationMode', ['above', 'after', 'hover', 'hidden'], d.annotationMode),
    granularity: choice('granularity', ['word', 'character'], d.granularity),
    toneStyle: choice('toneStyle', ['marks', 'numbers', 'none'], d.toneStyle),
    fontScale: num(v.fontScale, d.fontScale, 0.35, 1), opacity: num(v.opacity, d.opacity, 0.2, 1),
    spacing: num(v.spacing, d.spacing, 0, 0.3), batchSize: Math.round(num(v.batchSize, d.batchSize, 10, 500)),
    cacheSize: Math.round(num(v.cacheSize, d.cacheSize, 50, 10000)),
    color: typeof v.color === 'string' && /^#[\da-f]{6}$/i.test(v.color) ? v.color.toLowerCase() : d.color,
    excludedSelectors, domainRules
  };
}
export function ruleForHost(settings: Settings, host: string): DomainRule {
  const key = canonicalHost(host);
  // Exact host rules avoid unexpectedly enabling unrelated subdomains.
  return Object.hasOwn(settings.domainRules, key) ? settings.domainRules[key]! : 'inherit';
}
export function isEnabledForHost(settings: Settings, host: string): boolean {
  const rule = ruleForHost(settings, host);
  return rule === 'always' ? true : rule === 'never' ? false : settings.enabled;
}
