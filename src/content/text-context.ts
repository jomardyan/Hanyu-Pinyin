/** Bounded inline context improves pronunciation when a word is split across spans. */
export function inlineContext(text: Text): { before: string; after: string } {
  let scope = text.parentElement;
  const boundary = (el: Element) => /^(A|BUTTON|P|DIV|LI|TD|TH|BODY|H[1-6]|SECTION|ARTICLE|NAV)$/.test(el.tagName)
    || /^(block|flex|grid|table|list-item|flow-root)/.test(getComputedStyle(el).display);
  while (scope?.parentElement && !boundary(scope)) scope = scope.parentElement;
  if (!scope) return { before: '', after: '' };
  const ignored = (n: Node) => n instanceof Element && n.matches('[data-hp-rt],rt,rp,[data-hp-ui],script,style');
  function collect(direction: 'before' | 'after'): string {
    let current: Node = text, out = '', visits = 0;
    while (++visits <= 64 && Array.from(out).length < 24) {
      let next = direction === 'before' ? current.previousSibling : current.nextSibling;
      while (!next && current.parentNode && current.parentNode !== scope) {
        current = current.parentNode;
        next = direction === 'before' ? current.previousSibling : current.nextSibling;
      }
      if (!next) break;
      current = next;
      if (ignored(current)) continue;
      if (current instanceof Element && (getComputedStyle(current).display === 'none' || getComputedStyle(current).visibility === 'hidden' || boundary(current) || current.matches('code,pre,textarea,input,select,[hidden],[contenteditable]'))) break;
      while (current.hasChildNodes() && visits++ < 64) {
        let child = direction === 'before' ? current.lastChild : current.firstChild;
        while (child && ignored(child)) child = direction === 'before' ? child.previousSibling : child.nextSibling;
        if (!child) break;
        current = child;
      }
      if (current.nodeType !== 3) break;
      const value = current.nodeValue || '';
      const part = direction === 'before' ? value.match(/\p{Script=Han}+$/u)?.[0] : value.match(/^\p{Script=Han}+/u)?.[0];
      if (!part) break;
      out = direction === 'before' ? part + out : out + part;
      if (part.length !== value.length) break;
    }
    return direction === 'before' ? Array.from(out).slice(-24).join('') : Array.from(out).slice(0, 24).join('');
  }
  return { before: collect('before'), after: collect('after') };
}
