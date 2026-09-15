import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, isEnabledForHost, mergeSettings } from '../src/shared/settings';

describe('settings', () => {
  it('merges partial settings safely', () => {
    expect(mergeSettings({ toneStyle: 'none' }).toneStyle).toBe('none');
    expect(mergeSettings({ toneStyle: 'none' }).granularity).toBe(DEFAULT_SETTINGS.granularity);
  });

  it('honours per-domain rules', () => {
    const settings = mergeSettings({ enabled: false, domainRules: { 'example.com': 'always', 'blocked.test': 'never' } });
    expect(isEnabledForHost(settings, 'example.com')).toBe(true);
    expect(isEnabledForHost(settings, 'blocked.test')).toBe(false);
    expect(isEnabledForHost(settings, 'other.test')).toBe(false);
  });
});
