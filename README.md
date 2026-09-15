# Hanyu Pinyin Reader

A privacy-first Chrome and Microsoft Edge extension that adds Hanyu Pinyin pronunciation guides to Chinese text directly in webpages. Conversion runs locally in the browser with `pinyin-pro`. No webpage text is sent to a server.

## Core capabilities

- Manifest V3 architecture for current Chrome and Edge
- Phrase-aware conversion through `pinyin-pro`
- Simplified and Traditional Chinese
- Tone marks, tone numbers, or no tones
- Word or character annotation granularity
- Ruby annotations above text, hover-only mode, after-text mode, or hidden mode
- Incremental processing with `MutationObserver`
- Progressive batching through `requestIdleCallback` where available
- LRU conversion cache
- Open Shadow DOM traversal
- SPA and dynamically inserted content support
- Reversible DOM annotations without replacing parent `innerHTML`
- Per-domain always-enable and never-enable rules
- Popup controls, advanced options page, context-menu actions, selection helper, and keyboard commands
- Local-only operation with no analytics or tracking

## Development

Requirements are Node.js 20 or newer and npm.

```bash
npm install
npm run check
```

`npm run check` performs TypeScript validation, automated tests, a production build, and Chrome Web Store asset validation.

For development builds

```bash
npm run dev
```

For a minified production build

```bash
npm run build
```

The unpacked extension is generated in `dist`.

## Load in Chrome

1. Run `npm install` and `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose Load unpacked.
5. Select the `dist` directory.

## Load in Microsoft Edge

1. Build the extension.
2. Open `edge://extensions`.
3. Enable Developer mode.
4. Choose Load unpacked.
5. Select the `dist` directory.

## Permissions

The extension intentionally keeps permissions narrow.

- `storage` stores global settings and per-domain rules.
- `contextMenus` exposes selection actions.
- `activeTab` lets the popup and keyboard commands communicate with the active page after user interaction.
- The declared content script runs on normal HTTP and HTTPS pages because automatic annotation requires page access. Chrome internal pages and other protected browser pages are not accessible.

No remote JavaScript is loaded. The extension does not use `eval`, analytics, tracking, or remote Pinyin conversion.

## Architecture

- `src/pinyin` provides contextual Pinyin conversion and bounded caching.
- `src/content` detects eligible text, annotates it, restores it, processes dynamic content, and handles selection actions.
- `src/shared` owns settings and WebExtension storage.
- `src/background` owns context menus and keyboard commands.
- `src/popup` provides immediate page-level controls.
- `src/options` provides advanced and performance settings.
- `tests` covers Chinese detection, tone rendering, polyphonic phrase handling, Traditional Chinese, DOM exclusions, restoration, and domain rules.
- `fixtures/sample.html` provides a manual compatibility page with mixed content and dynamic insertion.

## DOM safety model

The content script edits only eligible text nodes. Each annotated text node is replaced with a small marked wrapper. The original text is stored on that wrapper so disabling or changing settings restores the exact text node content. Parent elements, attributes, links, event listeners, and accessibility attributes are not replaced.

The scanner skips scripts, styles, code, preformatted text, textareas, inputs, SVG, canvas, hidden content, contenteditable regions, existing ruby elements, and extension-owned UI. Additional CSS selectors can be excluded in the options page.

## Dynamic pages and performance

The extension never repeatedly rescans the whole document for normal DOM updates. Mutation records enqueue only changed or inserted nodes. Work is processed in configurable batches and scheduled with `requestIdleCallback` when available. Repeated Pinyin conversions use an LRU cache with a configurable maximum size.

Changing global appearance or pronunciation settings performs a deliberate restore and reprocess so existing annotations remain consistent.

## Accessibility

Chinese base text remains normal selectable text. `<rt>` pronunciation elements are marked `aria-hidden` to reduce duplicate screen-reader output. Keyboard navigation and parent element semantics are preserved.

## Known browser boundaries

Closed Shadow DOM cannot be inspected by extensions and is intentionally left untouched. Browser-internal pages, extension stores, PDF viewers, and other protected schemes do not permit normal content-script execution. Some highly stateful virtual-DOM applications may re-render modified text nodes. Mutation processing is defensive, but those applications remain an inherent browser-extension compatibility edge case.

## Dependency and license information

`pinyin-pro` is bundled into the production extension by esbuild, so runtime use does not require a CDN or network access. Review the dependency's own license in the installed package before distributing a store build and retain any notices required by that license.

This repository itself is released under the Unlicense, as declared in `LICENSE`.

## Chrome Web Store release files

The `chrome-store` directory contains the store listing copy, privacy disclosures, reviewer notes, submission checklist, store icon, five screenshots, the required small promotional tile, and an optional marquee asset.

The production extension manifest includes PNG icons at 16, 32, 48, and 128 pixels. Store-only marketing images are not copied into the runtime extension.

GitHub Actions validates the project, creates the production extension ZIP, and creates a second ZIP containing the Chrome Web Store listing assets. The workflow can also be started manually.

## Release artifact

The CI workflow produces two files for version 1.0.0.

- `hanyu-pinyin-reader-1.0.0-chrome-web-store.zip` is the file to upload as the extension package.
- `hanyu-pinyin-reader-1.0.0-store-assets.zip` contains listing graphics and submission documentation.
