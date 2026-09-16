import { annotateTextNode, installAnnotationStyles, restoreAll, restoreWrapper } from './annotation-engine';
import { ScanCursor, OWNED, UI, closestAcrossShadow, isProcessableTextNode, shouldSkipElement, splitLongText } from './dom-scanner';
import { configurePinyinCache, clearPinyinCache, pinyinCacheStats } from '../pinyin/pinyin-engine';
import { isEnabledForHost, mergeSettings, type Settings } from '../shared/settings';

/** about:blank and srcdoc frames inherit the parent origin but report an empty hostname,
 *  so website rules have to come from the nearest ancestor origin instead. */
export function frameHost(): string {
  if (location.hostname) return location.hostname;
  try {
    const origins = location.ancestorOrigins;
    for (let index = 0; index < (origins?.length ?? 0); index++) {
      const origin = origins.item(index);
      if (!origin || origin === 'null') continue;
      const host = new URL(origin).hostname;
      if (host) return host;
    }
  } catch { /* opaque or otherwise unreadable ancestors stay unmatched */ }
  return '';
}
/** The popup reports the running version, so it must never drift from the manifest. */
function extensionVersion(): string {
  try { return chrome.runtime.getManifest().version; } catch { return 'unknown'; }
}

export class PageController {
  settings = mergeSettings(undefined);
  enabled = false;
  readonly host = frameHost();
  private roots = new Set<Document | ShadowRoot>([document]);
  private jobs = new Map<Node, ScanCursor>();
  private failed = new WeakMap<Node, string>();
  suppressed = new WeakSet<Node>();
  private timer: number | null = null;
  private idle = false;
  private stopped = false;
  private handling = false;
  private observer = new MutationObserver(records => this.mutations(records));
  readonly stats = { processedNodes: 0, processedSegments: 0, visitedNodes: 0, errors: 0, lastProcessingMs: 0, batches: 0 };
  private visibility = () => { if (!document.hidden) this.schedule(); };
  constructor() { document.addEventListener('visibilitychange', this.visibility); }
  apply(value: Settings): void {
    this.cancel(); this.observer.disconnect(); this.jobs.clear();
    this.restore();
    this.settings = mergeSettings(value); this.failed = new WeakMap(); this.suppressed = new WeakSet();
    configurePinyinCache(this.settings.cacheSize);
    this.enabled = isEnabledForHost(this.settings, this.host) && this.settings.annotationMode !== 'hidden';
    this.stats.processedNodes = this.stats.processedSegments = this.stats.visitedNodes = this.stats.errors = this.stats.batches = 0;
    this.stopped = false;
    if (this.enabled) { this.ensureRoot(document); this.observe(); this.enqueue(document); }
  }
  rescan(): void { this.apply(this.settings); }
  clearCache(): void { clearPinyinCache(); }
  getState() { return { enabled: this.enabled, host: this.host, mode: this.settings.annotationMode,
    stats: { ...this.stats, pending: this.jobs.size, cache: pinyinCacheStats() }, version: extensionVersion() }; }
  private cancel(): void {
    if (this.timer !== null) {
      if (this.idle) window.cancelIdleCallback(this.timer); else window.clearTimeout(this.timer);
    }
    this.timer = null;
  }
  enqueue(root: Node): void {
    if (!this.enabled || !root.isConnected || closestAcrossShadow(root, `${OWNED},${UI},[data-hp-style]`)) return;
    if (!this.jobs.has(root)) this.jobs.set(root, new ScanCursor(root));
    this.schedule();
  }
  private schedule(): void {
    if (this.timer !== null || !this.enabled || this.stopped || !this.jobs.size) return;
    const run = () => { this.timer = null; this.pump(); };
    this.idle = typeof window.requestIdleCallback === 'function';
    this.timer = this.idle ? window.requestIdleCallback(run, { timeout: 150 }) : window.setTimeout(run, 16);
  }
  private ensureRoot(root: Document | ShadowRoot): void {
    this.roots.add(root); installAnnotationStyles(this.settings, root);
  }
  private observe(): void {
    if (!this.enabled || this.stopped) return;
    for (const root of this.roots) {
      if (!(root instanceof Document) && !root.host.isConnected) { this.roots.delete(root); continue; }
      this.observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true,
        attributeFilter: ['hidden', 'aria-hidden', 'inert', 'contenteditable', 'lang', 'class', 'style', 'open'] });
    }
  }
  /** Page and extension scripts cannot interleave during these synchronous mutations. */
  mutate<T>(fn: () => T): T {
    const pending = this.observer.takeRecords();
    if (pending.length && !this.handling) this.mutations(pending);
    this.observer.disconnect();
    try { return fn(); } finally { this.observe(); }
  }
  private pump(): void {
    if (!this.enabled || this.stopped) return;
    const start = performance.now();
    let visits = 0, processed = 0;
    this.mutate(() => {
      try {
        while (this.jobs.size && visits < this.settings.batchSize * 6 && processed < this.settings.batchSize && (visits === 0 || performance.now() - start < 9)) {
          const [root, cursor] = this.jobs.entries().next().value!;
          if (!root.isConnected) { this.jobs.delete(root); continue; }
          const node = cursor.next(this.settings); visits++; this.stats.visitedNodes++;
          if (cursor.done) this.jobs.delete(root);
          if (!node || !node.isConnected) continue;
          if (node instanceof Element && node.shadowRoot && !shouldSkipElement(node, this.settings)) {
            if (!this.roots.has(node.shadowRoot)) { this.ensureRoot(node.shadowRoot); this.enqueue(node.shadowRoot); }
          }
          if (this.suppressed.has(node) || !isProcessableTextNode(node, this.settings) || this.failed.get(node) === node.data) continue;
          const suffix = splitLongText(node); if (suffix) this.enqueue(suffix);
          try {
            const wrapper = annotateTextNode(node, this.settings);
            if (wrapper) { this.stats.processedNodes++; this.stats.processedSegments += wrapper.querySelectorAll('[data-hp-rt]').length; }
          } catch (error) {
            this.failed.set(node, node.data); this.stats.errors++;
            if (this.settings.debug && this.stats.errors <= 5) console.debug('[Hanyu Pinyin] Conversion failed', error instanceof Error ? error.name : 'Error');
          }
          processed++;
        }
      } catch (error) {
        // Fail closed for the current cursor, never retry the same broken job forever.
        const root = this.jobs.keys().next().value; if (root) this.jobs.delete(root);
        this.stats.errors++;
        if (this.settings.debug) console.debug('[Hanyu Pinyin] Scan failed', error instanceof Error ? error.name : 'Error');
      }
    });
    this.stats.lastProcessingMs = Math.round((performance.now() - start) * 10) / 10;
    this.stats.batches++; this.schedule();
  }
  private mutations(records: MutationRecord[]): void {
    if (!this.enabled || this.handling || this.stopped) return;
    this.handling = true;
    const changed = new Set<Element>();
    const added = new Set<Node>();
    try {
      for (const record of records) {
        if (closestAcrossShadow(record.target, `${UI},[data-hp-style],[data-hp-rt]`)) continue;
        const wrapper = closestAcrossShadow(record.target, OWNED);
        if (wrapper) { changed.add(wrapper); continue; }
        if (record.type === 'attributes') {
          const target = record.target as Element;
          if (record.attributeName === 'lang' || record.attributeName === 'contenteditable' || shouldSkipElement(target, this.settings)) changed.add(target);
          added.add(target);
        } else if (record.type === 'characterData') added.add(record.target);
        else for (const node of record.addedNodes) added.add(node);
      }
      this.observer.disconnect();
      for (const element of changed) {
        if (element.matches(OWNED)) for (const node of restoreWrapper(element)) added.add(node);
        else restoreAll(element);
      }
      for (const node of added) this.enqueue(node);
    } finally { this.handling = false; this.observe(); }
    this.schedule();
  }
  private restore(): void {
    for (const root of this.roots) {
      restoreAll(root); root.querySelector('style[data-hp-style]')?.remove();
    }
    this.roots.clear(); this.roots.add(document);
  }
  stop(): void {
    this.stopped = true; this.enabled = false; this.cancel(); this.observer.disconnect(); this.jobs.clear(); this.restore();
  }
  destroy(): void { this.stop(); document.removeEventListener('visibilitychange', this.visibility); }
  prepareManual(root: Document | ShadowRoot = document): void { this.ensureRoot(root); }
}
