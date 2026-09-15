// @vitest-environment jsdom
import { beforeEach, describe, it, expect } from 'vitest';
import { annotateTextNode, baseText, restoreAll } from '../src/content/annotation-engine';
import { collectTextNodes, splitLongText } from '../src/content/dom-scanner';
import { mergeSettings } from '../src/shared/settings';
beforeEach(() => { document.body.replaceChildren(); });
describe('safe DOM annotation', () => {
  it('preserves the original Text node and link', () => { document.body.innerHTML = '<a href="#"><span>学习中文</span></a>'; const a = document.querySelector('a')!, text = a.firstChild!.firstChild!; annotateTextNode(text as Text, mergeSettings(undefined)); restoreAll(a); expect(a.firstChild!.firstChild).toBe(text); expect(a.getAttribute('href')).toBe('#'); });
  it('skips nested code, plaintext editors, SVG, and authored ruby', () => { document.body.innerHTML = '<code><span>中文</span></code><div contenteditable="plaintext-only">中文</div><svg><text>中文</text></svg><ruby>中<rt>zhōng</rt></ruby><p>中文</p>'; expect(collectTextNodes(document.body, mergeSettings(undefined))).toHaveLength(1); });
  it('does not modify a non-Chinese node or a hidden-mode page', () => { const text = document.createTextNode('English'); document.body.append(text); expect(annotateTextNode(text, mergeSettings(undefined))).toBeNull(); text.data = '中文'; expect(annotateTextNode(text, mergeSettings({ annotationMode: 'hidden' }))).toBeNull(); });
  it('preserves page edits during restoration', () => { document.body.textContent = '中文'; const wrapper = annotateTextNode(document.body.firstChild as Text, mergeSettings(undefined))!; wrapper.querySelector('ruby')!.firstChild!.textContent = '你好'; restoreAll(); expect(document.body.textContent).toBe('你好'); });
  it('does not unwrap page-created lookalike attributes', () => { document.body.innerHTML = '<span data-hp-root="2" id="page-owned">中文</span>'; restoreAll(); expect(document.getElementById('page-owned')).not.toBeNull(); });
  it('omits ruby pronunciation from copied base text', () => { document.body.textContent = 'API 中文'; annotateTextNode(document.body.firstChild as Text, mergeSettings(undefined)); expect(baseText(document.body)).toBe('API 中文'); });
  it('does not split surrogate pairs', () => { const text = document.createTextNode('中'.repeat(255) + '𠀀中文'); document.body.append(text); const rest = splitLongText(text)!; expect(text.data + rest.data).toBe('中'.repeat(255) + '𠀀中文'); expect(text.length).toBe(255); });
});
