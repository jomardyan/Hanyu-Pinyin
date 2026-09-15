import { HAN_RE } from '../pinyin/pinyin-engine';
import type { Settings } from '../shared/settings';
const blocked = 'script,style,head,title,code,pre,kbd,samp,textarea,input,select,option,svg,math,canvas,noscript,template,iframe,object';
export const OWNED = '[data-hp-root="2"]';
export const UI = '[data-hp-ui]';
export function parentAcrossShadow(node: Node): Element | null {
  return node.parentElement || ((node.getRootNode() as ShadowRoot).host ?? null);
}
export function closestAcrossShadow(node: Node, selector: string): Element | null {
  let el = node.nodeType === 1 ? node as Element : parentAcrossShadow(node);
  while (el) {
    const match = el.closest(selector); if (match) return match;
    el = (el.getRootNode() as ShadowRoot).host ?? null;
  }
  return null;
}
export function shouldSkipElement(el: Element, settings: Settings, allowOwned = false): boolean {
  if (closestAcrossShadow(el, `${blocked},${UI},[hidden],[inert],[aria-hidden="true"]${allowOwned ? '' : ',ruby,[data-hp-root]'}`)) return true;
  if ((el as HTMLElement).isContentEditable || closestAcrossShadow(el, '[contenteditable]:not([contenteditable="false" i])')) return true;
  for (const selector of settings.excludedSelectors) {
    try { if (closestAcrossShadow(el, selector)) return true; } catch { /* legacy invalid selectors are harmless */ }
  }
  if (!settings.processNonChinese) {
    const lang = closestAcrossShadow(el, '[lang]')?.getAttribute('lang') || '';
    if (/^(ja|ko)(-|$)/i.test(lang)) return true;
  }
  let current: Element | null = el;
  while (current) {
    if (current.localName === 'details' && !(current as HTMLDetailsElement).open && el !== current) {
      const summary = [...current.children].find(child => child.localName === 'summary');
      if (!summary?.contains(el)) return true;
    }
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (style && (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || style.opacity === '0')) return true;
    current = parentAcrossShadow(current);
  }
  return false;
}
export function isProcessableTextNode(node: Node, settings: Settings): node is Text {
  if (node.nodeType !== 3 || !node.isConnected || !HAN_RE.test(node.nodeValue || '')) return false;
  if (!settings.processNonChinese && /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(node.nodeValue || '')) return false;
  const parent = parentAcrossShadow(node);
  return !!parent && !shouldSkipElement(parent, settings);
}
/** A resumable depth-first cursor. Capture sibling pointers before DOM replacement. */
export class ScanCursor {
  private pending: Node[];
  constructor(readonly root: Node) { this.pending = [root]; }
  next(settings: Settings): Node | null {
    const node = this.pending.pop(); if (!node) return null;
    if (node !== this.root && node.nextSibling) this.pending.push(node.nextSibling);
    if (node.isConnected && !(node.nodeType === 1 && shouldSkipElement(node as Element, settings)) && node.firstChild) {
      this.pending.push(node.firstChild);
    }
    return node;
  }
  get done(): boolean { return !this.pending.length; }
}
export function collectTextNodes(root: Node, settings: Settings, limit = Infinity): Text[] {
  const out: Text[] = [], cursor = new ScanCursor(root);
  while (!cursor.done && out.length < limit) {
    const node = cursor.next(settings); if (node && isProcessableTextNode(node, settings)) out.push(node);
  }
  return out;
}
export function openShadowRoots(root: Node): ShadowRoot[] {
  const result: ShadowRoot[] = [];
  if (root.nodeType === 1 && (root as Element).shadowRoot) result.push((root as Element).shadowRoot!);
  if ('querySelectorAll' in root) for (const el of (root as ParentNode).querySelectorAll('*')) if (el.shadowRoot) result.push(el.shadowRoot);
  return result;
}
/** Split without cutting a UTF-16 surrogate pair. Prefer a nearby punctuation boundary. */
export function splitLongText(node: Text, max = 256): Text | null {
  if (node.length <= max) return null;
  const prefix = node.data.slice(0, max);
  const boundary = Math.max(prefix.lastIndexOf('。'), prefix.lastIndexOf('，'), prefix.lastIndexOf(' '), prefix.lastIndexOf('\n'));
  let cut = boundary > max / 2 ? boundary + 1 : max;
  if (/[\uD800-\uDBFF]/.test(node.data[cut - 1]!)) cut--;
  return node.splitText(cut);
}
