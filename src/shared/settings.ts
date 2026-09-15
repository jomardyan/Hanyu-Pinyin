export type ToneStyle = 'marks' | 'numbers' | 'none';
export type AnnotationMode = 'above' | 'after' | 'hover' | 'hidden';
export type Granularity = 'word' | 'character';
export type DomainRule = 'inherit' | 'always' | 'never';

export interface Settings {
  enabled: boolean;
  annotationMode: AnnotationMode;
  granularity: Granularity;
  toneStyle: ToneStyle;
  fontScale: number;
  opacity: number;
  spacing: number;
  color: string;
  selectionTool: boolean;
  debug: boolean;
  batchSize: number;
  cacheSize: number;
  excludedSelectors: string[];
  domainRules: Record<string, DomainRule>;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  annotationMode: 'above',
  granularity: 'word',
  toneStyle: 'marks',
  fontScale: 0.56,
  opacity: 0.82,
  spacing: 0.08,
  color: '#5b6472',
  selectionTool: true,
  debug: false,
  batchSize: 80,
  cacheSize: 1500,
  excludedSelectors: [],
  domainRules: {}
};

export function mergeSettings(value: Partial<Settings> | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    excludedSelectors: Array.isArray(value?.excludedSelectors) ? value.excludedSelectors : [],
    domainRules: value?.domainRules ?? {}
  };
}

export function isEnabledForHost(settings: Settings, host: string): boolean {
  const rule = settings.domainRules[host];
  if (rule === 'always') return true;
  if (rule === 'never') return false;
  return settings.enabled;
}
