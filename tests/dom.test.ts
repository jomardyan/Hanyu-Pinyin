// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { annotateTextNode, restoreAll } from '../src/content/annotation-engine';
import { collectTextNodes } from '../src/content/dom-scanner';
import { DEFAULT_SETTINGS } from '../src/shared/settings';

beforeEach(() => { document.body.innerHTML = ''; });

describe('DOM annotation', () => {
  it('annotates Chinese without destroying surrounding elements', () => {
    document.body.innerHTML = '<a id="x" href="#">学习中文</a>';
    const link = document.querySelector('#x')!;
    const nodes = collectTextNodes(link, DEFAULT_SETTINGS);
    annotateTextNode(nodes[0]!, DEFAULT_SETTINGS);
    expect(link.querySelectorAll('ruby').length).toBeGreaterThan(0);
    expect(link.getAttribute('href')).toBe('#');
  });

  it('does not process code or editable areas', () => {
    document.body.innerHTML = '<code>中文</code><div contenteditable="true">中文</div><p>中文</p>';
    expect(collectTextNodes(document.body, DEFAULT_SETTINGS)).toHaveLength(1);
  });

  it('restores original text', () => {
    document.body.innerHTML = '<p id="p">我喜欢学习中文</p>';
    const p = document.querySelector('#p')!;
    annotateTextNode(collectTextNodes(p, DEFAULT_SETTINGS)[0]!, DEFAULT_SETTINGS);
    restoreAll(p);
    expect(p.textContent).toBe('我喜欢学习中文');
    expect(p.querySelector('ruby')).toBeNull();
  });

  it('does not double-process existing ruby annotations', () => {
    document.body.innerHTML = '<p><ruby>中<rt>zhōng</rt></ruby> 中文</p>';
    expect(collectTextNodes(document.body, DEFAULT_SETTINGS)).toHaveLength(1);
  });
});
