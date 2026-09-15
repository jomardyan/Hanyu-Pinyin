import { HAN_RE } from '../pinyin/pinyin-engine';
import type { Settings } from '../shared/settings';

const BLOCKED_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'SVG', 'CANVAS', 'NOSCRIPT', 'SELECT', 'OPTION']);

export function shouldSkipElement(element: Element, settings: Settings): boolean {
  if (BLOCKED_TAGS.has(element.tagName)) return true;
  if (element.closest('[contenteditable="true"], [contenteditable=""], ruby, [data-hp-root], [data-hp-ui]')) return true;
  if (element.closest('[hidden], [aria-hidden="true"]')) return true;
  for (const selector of settings.excludedSelectors) {
    try {
      if (selector && element.closest(selector)) return true;
    } catch {
      // Ignore invalid user selectors instead of breaking page processing.
    }
  }
  return false;
}

export function isProcessableTextNode(node: Node, settings: Settings): node is Text {
  if (node.nodeType !== Node.TEXT_NODE) return false;
  const text = node.nodeValue ?? '';
  if (!HAN_RE.test(text)) return false;
  const parent = node.parentElement;
  if (!parent || shouldSkipElement(parent, settings)) return false;
  return true;
}

export function collectTextNodes(root: Node, settings: Settings, limit = Number.POSITIVE_INFINITY): Text[] {
  const nodes: Text[] = [];
  if (isProcessableTextNode(root, settings)) return [root];
  const ownerDocument = root.nodeType === Node.DOCUMENT_NODE ? root as Document : root.ownerDocument;
  if (!ownerDocument) return nodes;

  const walker = ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return isProcessableTextNode(node, settings) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  while (nodes.length < limit) {
    const current = walker.nextNode();
    if (!current) break;
    nodes.push(current as Text);
  }
  return nodes;
}

export function openShadowRoots(root: Node): ShadowRoot[] {
  const roots: ShadowRoot[] = [];
  if (!(root instanceof Element || root instanceof Document || root instanceof ShadowRoot)) return roots;
  const elements = root instanceof Element ? [root, ...Array.from(root.querySelectorAll('*'))] : Array.from(root.querySelectorAll('*'));
  for (const element of elements) {
    if (element.shadowRoot) roots.push(element.shadowRoot);
  }
  return roots;
}
