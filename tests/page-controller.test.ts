// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PageController } from '../src/content/page-controller';
import { mergeSettings } from '../src/shared/settings';

let controller: PageController;
beforeEach(() => { document.body.innerHTML = '<div id="host"></div>'; controller = new PageController(); });
afterEach(() => { controller.destroy(); });
const drained = () => vi.waitFor(() => expect(controller.getState().stats.pending).toBe(0));

it('restores nested shadow annotations when their ancestor becomes excluded', async () => {
  const host = document.getElementById('host')!;
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<p>中文</p><div id="inner"></div>';
  const nested = shadow.querySelector('#inner')!.attachShadow({ mode: 'open' });
  nested.innerHTML = '<p>学习中文</p>';
  controller.apply(mergeSettings({ excludedSelectors: ['.excluded'] }));
  await drained();
  expect(nested.querySelector('rt')).not.toBeNull();
  host.className = 'excluded';
  await vi.waitFor(() => {
    expect(shadow.querySelector('rt')).toBeNull();
    expect(nested.querySelector('rt')).toBeNull();
  });
  host.className = '';
  await vi.waitFor(() => expect(nested.querySelector('rt')).not.toBeNull());
});

it('rescans an already discovered shadow root when its host becomes visible again', async () => {
  const host = document.getElementById('host')!;
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<p>中文</p>';
  controller.apply(mergeSettings(undefined));
  await drained();
  host.setAttribute('hidden', '');
  await new Promise(resolve => setTimeout(resolve, 30));
  shadow.innerHTML = '<p>学习中文</p>';
  await new Promise(resolve => setTimeout(resolve, 30));
  await drained();
  host.removeAttribute('hidden');
  await vi.waitFor(() => expect(shadow.querySelector('rt')).not.toBeNull());
});
