// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mergeSettings, type Settings } from '../src/shared/settings';

const mocks = vi.hoisted(() => ({
  apply: vi.fn(), stop: vi.fn(), load: vi.fn(), subscribe: vi.fn(),
  unsubscribe: vi.fn(), destroy: vi.fn()
}));
vi.mock('../src/shared/storage', () => ({ loadSettings: mocks.load, subscribeSettings: mocks.subscribe }));
vi.mock('../src/content/page-controller', () => ({ PageController: class {
  apply = mocks.apply; stop = mocks.stop; destroy = mocks.destroy;
} }));
vi.mock('../src/content/selection-tool', () => ({ SelectionTool: class {
  hide() {} destroy() {}
} }));
let resolveSettings: (value: Settings) => void;
let subscriber: (value: Settings) => void;
const world = globalThis as typeof globalThis & { __hanyuReader?: { destroy(): void } };
beforeEach(() => {
  vi.resetModules();
  mocks.load.mockImplementation(() => new Promise<Settings>(resolve => { resolveSettings = resolve; }));
  mocks.subscribe.mockImplementation(listener => { subscriber = listener; return mocks.unsubscribe; });
  vi.stubGlobal('chrome', { runtime: { id: 'test', onMessage: { addListener: vi.fn(), removeListener: vi.fn() } } });
});
afterEach(() => { world.__hanyuReader?.destroy(); delete world.__hanyuReader; vi.unstubAllGlobals(); });
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

it('does not restart a suspended page when the initial settings request completes', async () => {
  await import('../src/content/content-script');
  window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
  resolveSettings(mergeSettings(undefined));
  await settle();
  expect(mocks.apply).not.toHaveBeenCalled();
});

it('does not overwrite a newer storage notification with an older startup response', async () => {
  await import('../src/content/content-script');
  const latest = mergeSettings({ enabled: false });
  expect(mocks.subscribe).toHaveBeenCalledOnce();
  subscriber(latest);
  resolveSettings(mergeSettings(undefined));
  await settle();
  expect(mocks.apply).toHaveBeenLastCalledWith(latest);
});

it('does not revive a destroyed controller after an asynchronous back navigation load', async () => {
  await import('../src/content/content-script');
  resolveSettings(mergeSettings(undefined)); await settle();
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  world.__hanyuReader!.destroy(); mocks.apply.mockClear();
  resolveSettings(mergeSettings(undefined)); await settle();
  expect(mocks.apply).not.toHaveBeenCalled();
});
