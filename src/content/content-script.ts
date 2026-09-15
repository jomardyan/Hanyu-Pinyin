import { annotateTextNode, installAnnotationStyles, restoreAll } from './annotation-engine';
import { collectTextNodes, openShadowRoots } from './dom-scanner';
import { configurePinyinCache, HAN_RE } from '../pinyin/pinyin-engine';
import { isEnabledForHost, type Settings } from '../shared/settings';
import { loadSettings, subscribeSettings } from '../shared/storage';

interface RuntimeStats {
  processedNodes: number;
  processedSegments: number;
  skippedNodes: number;
  errors: number;
  lastProcessingMs: number;
}

let settings: Settings;
let enabled = false;
let observer: MutationObserver | null = null;
let queue: Node[] = [];
let scheduled = false;
let selectionButton: HTMLButtonElement | null = null;
const stats: RuntimeStats = { processedNodes: 0, processedSegments: 0, skippedNodes: 0, errors: 0, lastProcessingMs: 0 };

function debug(...args: unknown[]): void {
  if (settings?.debug) console.debug('[Hanyu Pinyin]', ...args);
}

function enqueue(node: Node): void {
  queue.push(node);
  schedule();
}

function schedule(): void {
  if (scheduled || !enabled) return;
  scheduled = true;
  const run = () => void processQueue();
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 200 });
  } else {
    setTimeout(run, 0);
  }
}

async function processQueue(): Promise<void> {
  scheduled = false;
  if (!enabled) return;
  const started = performance.now();
  let budget = Math.max(10, settings.batchSize);

  while (queue.length && budget > 0) {
    const root = queue.shift();
    if (!root || (!root.isConnected && root !== document)) continue;

    const requestedLimit = budget;
    const nodes = collectTextNodes(root, settings, requestedLimit);
    const mayHaveMore = nodes.length === requestedLimit;

    for (const node of nodes) {
      try {
        if (annotateTextNode(node, settings)) {
          stats.processedNodes += 1;
          stats.processedSegments += 1;
        }
      } catch (error) {
        stats.errors += 1;
        debug('Node annotation failed', error);
      }
      budget -= 1;
      if (budget <= 0) break;
    }

    // collectTextNodes intentionally stops at the requested limit. If the
    // limit was reached, the root may still contain eligible Chinese text.
    // Requeue it so large pages are processed progressively instead of only
    // annotating the first batch near the top of the document.
    if (mayHaveMore && (root.isConnected || root === document)) {
      queue.push(root);
    } else {
      // Only discover shadow roots after this root has been fully drained.
      // This prevents repeatedly enqueueing the same shadow roots on every
      // continuation batch of a large document.
      for (const shadowRoot of openShadowRoots(root)) queue.push(shadowRoot);
    }
  }

  stats.lastProcessingMs = Math.round((performance.now() - started) * 10) / 10;
  if (queue.length) schedule();
}

function startObserver(): void {
  observer?.disconnect();
  observer = new MutationObserver(records => {
    if (!enabled) return;
    for (const record of records) {
      if (record.type === 'characterData' && record.target.parentElement?.closest('[data-hp-root]')) continue;
      if (record.type === 'characterData') enqueue(record.target);
      for (const node of Array.from(record.addedNodes)) {
        if (node instanceof Element && node.closest('[data-hp-root]')) continue;
        enqueue(node);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}

function stopAndRestore(): void {
  observer?.disconnect();
  observer = null;
  queue = [];
  scheduled = false;
  restoreAll(document);
  document.querySelector('style[data-hp-style]')?.remove();
}

function apply(next: Settings): void {
  settings = next;
  configurePinyinCache(settings.cacheSize);
  const shouldEnable = isEnabledForHost(settings, location.hostname);
  if (!shouldEnable) {
    enabled = false;
    stopAndRestore();
    return;
  }
  enabled = true;
  restoreAll(document);
  installAnnotationStyles(settings);
  queue = [document];
  startObserver();
  schedule();
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

function selectedChinese(): string {
  const text = window.getSelection()?.toString().trim() ?? '';
  return HAN_RE.test(text) ? text : '';
}

async function handleSelectionAction(action: string): Promise<void> {
  const text = selectedChinese();
  if (!text) return;
  const { pronounce } = await import('../pinyin/pinyin-engine');
  const tokens = pronounce(text, settings.toneStyle, settings.granularity);
  const p = tokens.map(item => item.pinyin).join(' ');
  if (action === 'copy-pinyin') await copyText(p);
  if (action === 'copy-both') await copyText(`${text}\n${p}`);
  if (action === 'annotate-selection') {
    const range = window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0) : null;
    if (!range || range.collapsed) return;
    const span = document.createElement('span');
    span.dataset.hpRoot = '1';
    span.dataset.hpOriginal = text;
    span.textContent = `${text} (${p})`;
    range.deleteContents();
    range.insertNode(span);
  }
}

function installSelectionTool(): void {
  document.addEventListener('mouseup', event => {
    selectionButton?.remove();
    selectionButton = null;
    if (!enabled || !settings.selectionTool) return;
    const text = selectedChinese();
    if (!text) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.hpUi = '1';
    button.className = 'hp-selection-button';
    button.textContent = 'Pinyin';
    button.style.left = `${Math.min(window.innerWidth - 80, event.clientX + 8)}px`;
    button.style.top = `${Math.min(window.innerHeight - 40, event.clientY + 8)}px`;
    button.addEventListener('mousedown', e => e.preventDefault());
    button.addEventListener('click', () => void handleSelectionAction('copy-both').finally(() => button.remove()));
    document.documentElement.append(button);
    selectionButton = button;
  }, true);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'hp-status') {
    sendResponse({ enabled, stats, mode: settings?.annotationMode, host: location.hostname });
    return;
  }
  if (message?.type === 'hp-reprocess') {
    void loadSettings().then(apply).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === 'hp-selection-action') {
    void handleSelectionAction(message.action).then(() => sendResponse({ ok: true }));
    return true;
  }
});

void loadSettings().then(initial => {
  apply(initial);
  installSelectionTool();
  subscribeSettings(apply);
});
