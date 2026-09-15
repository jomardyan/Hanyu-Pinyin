import { HAN_RUN_RE, pronounce } from '../pinyin/pinyin-engine';
import type { Settings } from '../shared/settings';

export interface AnnotationStats {
  processedSegments: number;
  processedNodes: number;
  skippedNodes: number;
  errors: number;
}

function ruby(token: { han: string; pinyin: string }, settings: Settings): HTMLElement {
  const el = document.createElement('ruby');
  el.className = 'hp-ruby';
  const base = document.createTextNode(token.han);
  const rt = document.createElement('rt');
  rt.textContent = token.pinyin;
  rt.setAttribute('aria-hidden', 'true');
  el.append(base, rt);
  return el;
}

function annotateHanRun(run: string, settings: Settings): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const tokens = pronounce(run, settings.toneStyle, settings.granularity);

  if (settings.annotationMode === 'after') {
    fragment.append(document.createTextNode(run));
    const p = document.createElement('span');
    p.className = 'hp-after';
    p.setAttribute('aria-hidden', 'true');
    p.textContent = ` (${tokens.map(token => token.pinyin).join(' ')})`;
    fragment.append(p);
    return fragment;
  }

  for (const token of tokens) fragment.append(ruby(token, settings));
  return fragment;
}

export function annotateTextNode(node: Text, settings: Settings): HTMLElement | null {
  const text = node.nodeValue ?? '';
  if (!text.trim()) return null;
  const wrapper = document.createElement('span');
  wrapper.dataset.hpRoot = '1';
  wrapper.dataset.hpOriginal = text;

  let cursor = 0;
  for (const match of text.matchAll(HAN_RUN_RE)) {
    const index = match.index ?? 0;
    if (index > cursor) wrapper.append(document.createTextNode(text.slice(cursor, index)));
    wrapper.append(annotateHanRun(match[0], settings));
    cursor = index + match[0].length;
  }
  if (cursor < text.length) wrapper.append(document.createTextNode(text.slice(cursor)));
  node.replaceWith(wrapper);
  return wrapper;
}

export function restoreWrapper(wrapper: Element): void {
  const original = (wrapper as HTMLElement).dataset.hpOriginal;
  if (original === undefined) return;
  wrapper.replaceWith(document.createTextNode(original));
}

export function restoreAll(root: ParentNode = document): void {
  for (const wrapper of Array.from(root.querySelectorAll('[data-hp-root]'))) restoreWrapper(wrapper);
}

export function installAnnotationStyles(settings: Settings): HTMLStyleElement {
  let style = document.querySelector<HTMLStyleElement>('style[data-hp-style]');
  if (!style) {
    style = document.createElement('style');
    style.dataset.hpStyle = '1';
    (document.head || document.documentElement).append(style);
  }
  style.textContent = `
    [data-hp-root] { display: inline; }
    .hp-ruby { ruby-position: over; ruby-align: center; }
    .hp-ruby rt, .hp-after {
      font-size: ${settings.fontScale}em;
      opacity: ${settings.opacity};
      color: ${settings.color};
      letter-spacing: ${settings.spacing}em;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      font-weight: 400;
      line-height: 1;
      user-select: none;
    }
    ${settings.annotationMode === 'hover' ? '.hp-ruby rt { opacity: 0; } .hp-ruby:hover rt { opacity: ' + settings.opacity + '; }' : ''}
    ${settings.annotationMode === 'hidden' ? '.hp-ruby rt, .hp-after { display: none !important; }' : ''}
    .hp-selection-button { position: fixed; z-index: 2147483647; border: 0; border-radius: 999px; padding: 6px 10px; background: #111827; color: white; font: 12px/1.2 system-ui; box-shadow: 0 4px 16px rgba(0,0,0,.2); cursor: pointer; }
  `;
  return style;
}
