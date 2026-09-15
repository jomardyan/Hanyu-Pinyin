import { annotateTextNode, baseText, restoreWrapper } from './annotation-engine';
import { closestAcrossShadow, collectTextNodes, OWNED, parentAcrossShadow, shouldSkipElement } from './dom-scanner';
import { HAN_RE, transliterate } from '../pinyin/pinyin-engine';
import type { PageController } from './page-controller';

export async function copyText(text: string): Promise<void> {
  try { await navigator.clipboard.writeText(text); return; } catch { /* gesture-scoped fallback below */ }
  const selection = window.getSelection(), ranges: Range[] = [];
  for (let i = 0; selection && i < selection.rangeCount; i++) ranges.push(selection.getRangeAt(i).cloneRange());
  const active = document.activeElement as HTMLElement | null;
  const area = document.createElement('textarea'); area.dataset.hpUi = '1'; area.value = text;
  area.style.cssText = 'position:fixed;left:-10000px;top:0;opacity:0';
  document.documentElement.append(area);
  let copied = false;
  try { area.focus(); area.select(); copied = document.execCommand('copy'); }
  finally {
    area.remove(); active?.focus({ preventScroll: true });
    selection?.removeAllRanges(); for (const range of ranges) selection?.addRange(range);
  }
  if (!copied) throw new Error('Clipboard access was blocked. Select the text again and retry.');
}
export class SelectionTool {
  private range: Range | null = null;
  private host: HTMLElement | null = null;
  private capture = () => {
    if (this.host?.matches(':focus-within')) return;
    const selected = window.getSelection();
    if (!selected?.rangeCount || selected.isCollapsed) { this.hide(); this.range = null; return; }
    this.range = selected.getRangeAt(0).cloneRange();
    const parent = parentAcrossShadow(this.range.startContainer);
    if (!parent || shouldSkipElement(parent, this.controller.settings, true) || !HAN_RE.test(baseText(this.range.cloneContents()))) { this.hide(); this.range = null; return; }
    if (this.controller.enabled && this.controller.settings.selectionTool) this.show();
  };
  private escape = (event: KeyboardEvent) => { if (event.key === 'Escape') this.hide(); };
  private dismiss = (event: Event) => { if (this.host && !event.composedPath().includes(this.host)) this.hide(); };
  constructor(private controller: PageController) {
    document.addEventListener('mouseup', this.capture);
    document.addEventListener('keyup', this.capture);
    document.addEventListener('keydown', this.escape);
    document.addEventListener('pointerdown', this.dismiss, true);
  }
  hide(): void { this.host?.remove(); this.host = null; }
  destroy(): void {
    this.hide(); document.removeEventListener('mouseup', this.capture); document.removeEventListener('keyup', this.capture);
    document.removeEventListener('keydown', this.escape); document.removeEventListener('pointerdown', this.dismiss, true);
  }
  private selectedRange(): Range | null {
    const current = window.getSelection();
    return current?.rangeCount && !current.isCollapsed ? current.getRangeAt(0).cloneRange()
      : this.range?.startContainer.isConnected ? this.range.cloneRange() : null;
  }
  async act(action: string, fallbackText = ''): Promise<void> {
    if (!['annotate-selection', 'remove-selection', 'copy-pinyin', 'copy-both'].includes(action)) throw new Error('Unknown selection action');
    const range = this.selectedRange();
    const text = range ? baseText(range.cloneContents()) : fallbackText;
    if (!text || !HAN_RE.test(text)) throw new Error('Select Chinese text first');
    if (text.length > 10000) throw new Error('Select fewer than 10,000 characters at a time');
    if (action.startsWith('copy-')) {
      const p = transliterate(text, this.controller.settings.toneStyle);
      await copyText(action === 'copy-both' ? `${text}\n${p}` : p); return;
    }
    if (!range) throw new Error('The selection is no longer available');
    const parent = parentAcrossShadow(range.startContainer);
    if (!parent || shouldSkipElement(parent, this.controller.settings, true)) throw new Error('Editable, hidden, or excluded content is not modified');
    this.controller.mutate(() => {
      const root = range.startContainer.getRootNode();
      this.controller.prepareManual(root instanceof ShadowRoot ? root : document);
      if (action === 'remove-selection') {
        const scope = range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode! : range.commonAncestorContainer;
        const wrappers = new Set<Element>();
        const own = closestAcrossShadow(scope, OWNED); if (own) wrappers.add(own);
        if ('querySelectorAll' in scope) for (const el of (scope as ParentNode).querySelectorAll(OWNED)) if (range.intersectsNode(el)) wrappers.add(el);
        // Remove only touched pronunciation units, not an entire paragraph wrapper.
        const touches = (node: Node) => {
          if (!range.intersectsNode(node)) return false;
          if (node.nodeType !== 3) return true;
          const start = range.startContainer === node ? range.startOffset : 0;
          const end = range.endContainer === node ? range.endOffset : (node as Text).length;
          return end > start;
        };
        for (const wrapper of wrappers) {
          const units = [...wrapper.querySelectorAll('[data-hp-ruby]')].filter(ruby => [...ruby.childNodes].some(node => node.nodeType === 3 && touches(node)));
          const after = [...wrapper.querySelectorAll('.hp-after[data-hp-rt]')].filter(rt => rt.previousSibling && touches(rt.previousSibling));
          for (const ruby of units) { ruby.querySelectorAll('[data-hp-rt]').forEach(rt => rt.remove()); ruby.replaceWith(...ruby.childNodes); }
          for (const rt of after) rt.remove();
          if (!wrapper.querySelector('[data-hp-rt]')) for (const node of restoreWrapper(wrapper)) this.controller.suppressed.add(node);
        }
      } else {
        const nodes = collectTextNodes(range.commonAncestorContainer, this.controller.settings);
        const selected = nodes.filter(node => range.intersectsNode(node)).map(node => ({ node,
          start: node === range.startContainer ? range.startOffset : 0,
          end: node === range.endContainer ? range.endOffset : node.length }));
        // Work backwards so splitting a later Text node cannot move earlier boundaries.
        for (const { node, start, end } of selected.reverse()) {
          if (end <= start) continue;
          if (end < node.length) node.splitText(end);
          const part = start ? node.splitText(start) : node;
          const mode = this.controller.settings.annotationMode === 'hidden' ? 'above' : this.controller.settings.annotationMode;
          annotateTextNode(part, { ...this.controller.settings, annotationMode: mode });
        }
      }
    });
  }
  private show(): void {
    this.hide(); if (!this.range) return;
    const rect = this.range.getBoundingClientRect();
    const host = document.createElement('div'); host.dataset.hpUi = '1';
    host.style.cssText = `position:fixed!important;z-index:2147483647!important;left:${Math.max(4, Math.min(innerWidth - 340, rect.left))}px!important;top:${Math.max(4, Math.min(innerHeight - 64, rect.bottom + 6))}px!important;`;
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = ':host{all:initial}.bar{font:12px/1.4 system-ui;display:flex;gap:5px;flex-wrap:wrap;max-width:min(330px,90vw);background:#172b4d;color:white;padding:8px;border-radius:9px;box-shadow:0 3px 15px #0003}button{font:inherit;background:white;color:#172b4d;border:0;border-radius:4px;padding:6px;cursor:pointer}button:focus-visible{outline:3px solid #77c7ff}p{margin:3px 0;width:100%}';
    const bar = document.createElement('div'); bar.className = 'bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Pinyin selection actions');
    const notice = document.createElement('p'); notice.setAttribute('role', 'status'); notice.hidden = true;
    for (const [label, action] of [['Annotate', 'annotate-selection'], ['Remove', 'remove-selection'], ['Copy Pinyin', 'copy-pinyin'], ['Copy both', 'copy-both']]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label!;
      button.addEventListener('mousedown', event => event.preventDefault());
      button.addEventListener('click', () => {
        button.disabled = true;
        void this.act(action!).then(() => { notice.hidden = false; notice.textContent = action!.startsWith('copy') ? 'Copied' : 'Updated'; }, error => {
          notice.hidden = false; notice.textContent = error instanceof Error ? error.message : 'Action failed';
        }).finally(() => { button.disabled = false; });
      }); bar.append(button);
    }
    bar.append(notice); shadow.append(style, bar); document.documentElement.append(host); this.host = host;
  }
}
