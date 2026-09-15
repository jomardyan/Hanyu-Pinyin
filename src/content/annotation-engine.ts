import { inlineContext } from './text-context';
import { pronounce } from '../pinyin/pinyin-engine';
import { isProcessableTextNode, OWNED } from './dom-scanner';
import type { Settings } from '../shared/settings';
const originals = new WeakMap<Element, { node: Text; text: string }>();
export interface AnnotationStats { processedSegments: number; processedNodes: number; skippedNodes: number; errors: number }
export function annotateTextNode(node: Text, settings: Settings): HTMLElement | null {
  if (settings.annotationMode === 'hidden' || !isProcessableTextNode(node, settings)) return null;
  const doc = node.ownerDocument, wrapper = doc.createElement('span');
  wrapper.dataset.hpRoot = '2';
  let count = 0;
  for (const token of pronounce(node.data, settings.toneStyle, settings.granularity, inlineContext(node))) {
    if (!token.pinyin) { wrapper.append(doc.createTextNode(token.han)); continue; }
    count++;
    if (settings.annotationMode === 'after') {
      wrapper.append(doc.createTextNode(token.han));
      const after = doc.createElement('span');
      after.dataset.hpRt = '1'; after.className = 'hp-after'; after.setAttribute('aria-hidden', 'true');
      after.textContent = ` (${token.pinyin})`; wrapper.append(after);
    } else {
      const ruby = doc.createElement('ruby'); ruby.dataset.hpRuby = '1'; ruby.className = 'hp-ruby';
      const rt = doc.createElement('rt'); rt.dataset.hpRt = '1'; rt.textContent = token.pinyin;
      rt.setAttribute('aria-hidden', 'true');
      ruby.append(doc.createTextNode(token.han), rt); wrapper.append(ruby);
    }
  }
  if (!count) return null;
  originals.set(wrapper, { node, text: node.data });
  node.replaceWith(wrapper);
  return wrapper;
}
export function baseText(root: ParentNode): string {
  const copy = (root as Node).cloneNode(true) as ParentNode;
  copy.querySelectorAll('[data-hp-rt],rt,rp').forEach(el => el.remove());
  return (copy as Node).textContent || '';
}
export function restoreWrapper(wrapper: Element): Node[] {
  const state = originals.get(wrapper);
  if (!state) return []; // Never unwrap page-created lookalikes.
  const live = baseText(wrapper);
  // Preserve the original Text instance when its content has not been edited by the page.
  const cleanShape = [...wrapper.querySelectorAll('*')].every(el => el.matches('[data-hp-ruby],[data-hp-rt]'));
  if (state && cleanShape) {
    if (live !== state.text) state.node.data = live;
    wrapper.replaceWith(state.node); originals.delete(wrapper); return [state.node];
  }
  // A framework may have edited or inserted nodes. Preserve those current nodes, not a stale snapshot.
  wrapper.querySelectorAll('[data-hp-rt]').forEach(el => el.remove());
  wrapper.querySelectorAll('[data-hp-ruby]').forEach(el => el.replaceWith(...el.childNodes));
  const nodes = [...wrapper.childNodes]; wrapper.replaceWith(...nodes); originals.delete(wrapper); return nodes;
}
export function restoreAll(root: ParentNode = document): Node[] {
  const out: Node[] = [];
  if (root instanceof Element && root.matches(OWNED)) out.push(...restoreWrapper(root));
  for (const wrapper of root.querySelectorAll(OWNED)) out.push(...restoreWrapper(wrapper));
  return out;
}
export function installAnnotationStyles(settings: Settings, root: Document | ShadowRoot = document): HTMLStyleElement {
  let style = root.querySelector<HTMLStyleElement>('style[data-hp-style]');
  if (!style) {
    style = document.createElement('style'); style.dataset.hpStyle = '1';
    (root instanceof Document ? root.head || root.documentElement : root).append(style);
  }
  style.textContent = `
    ${OWNED} { display: inline !important; font: inherit; }
    ${OWNED} ruby[data-hp-ruby] { display: ruby !important; ruby-position: over !important; ruby-align: center; font: inherit; text-indent: 0; }
    ${OWNED} [data-hp-rt] { font: 400 ${settings.fontScale}em/1 system-ui,-apple-system,"Segoe UI",sans-serif !important;
      opacity: ${settings.opacity}; color: ${settings.color} !important; letter-spacing: ${settings.spacing}em !important;
      text-transform: none !important; text-decoration: none !important; user-select: none !important; -webkit-user-select: none !important; }
    ${OWNED} rt[data-hp-rt] { display: ruby-text !important; text-align: center !important; }
    ${settings.annotationMode === 'hover' ? `${OWNED} rt[data-hp-rt]{opacity:0} ${OWNED} ruby:hover rt[data-hp-rt],a:focus ${OWNED} rt[data-hp-rt],button:focus ${OWNED} rt[data-hp-rt]{opacity:${settings.opacity}}` : ''}
  `;
  return style;
}
