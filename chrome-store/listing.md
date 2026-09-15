# Chrome Web Store listing

## Product name

Hanyu Pinyin Reader

## Short description

Read Chinese webpages more easily with local, phrase-aware Hanyu Pinyin pronunciation guides above the original text.

## Primary category

Education

## Primary language

English

## Detailed description

Hanyu Pinyin Reader adds pronunciation guides directly to Chinese text on webpages.

The extension is designed for Chinese learners and readers who want pronunciation support without replacing or translating the original page. Pinyin can appear above Chinese characters and words, after the text, only on hover, or remain hidden when it is not needed.

Key features

- Phrase-aware Hanyu Pinyin pronunciation
- Simplified and Traditional Chinese support
- Tone marks, tone numbers, or no-tone display
- Word and character annotation modes
- Pinyin above Chinese through native ruby-style annotations
- Per-website enable and disable rules
- Adjustable Pinyin size, opacity, spacing, and color
- Selection actions for showing or copying Pinyin
- Keyboard shortcuts
- Support for dynamically loaded pages and common single-page applications
- Local conversion with no remote pronunciation service
- No advertising, analytics, or tracking

The extension processes Chinese text locally in the browser. Webpage text is not sent to the developer or to a remote Pinyin service. User preferences and website rules are stored locally through Chrome extension storage.

Some protected Chrome pages, the Chrome Web Store, browser PDF viewers, and pages using closed Shadow DOM cannot be modified by normal extensions.

## Single purpose statement

Add local Hanyu Pinyin pronunciation annotations to Chinese text on webpages so users can read and learn Chinese more easily.

## Permission justifications

### storage

Required to save the user's annotation preferences, appearance settings, performance settings, and per-domain enable or disable rules in Chrome extension storage.

### contextMenus

Required to provide user-invoked selection actions such as adding Pinyin to selected Chinese text and copying Chinese text with Pinyin.

### activeTab

Required when the user opens the extension or invokes a keyboard command so the extension can identify the active page, display page status, and send user-requested annotation actions to that page.

### Website access

The content script runs on HTTP and HTTPS webpages because the extension's single purpose is to identify Chinese text on webpages and annotate it with Pinyin. Page text is processed locally in the browser and is not transmitted externally.

## Remote code declaration

No. The extension does not execute remotely hosted code. `pinyin-pro` and its dictionary data are bundled into the packaged extension at build time.

## Data disclosure

The extension does not send user data, browsing history, webpage content, or selected text to the developer or third parties.

The extension reads webpage text locally only to perform its user-facing Pinyin annotation function. User preferences and per-domain rules are saved locally using `chrome.storage.local`.

The extension does not contain analytics, advertising, tracking, account registration, or remote Pinyin conversion.

## Store graphic files

- `assets/store-icon-128.png`
- `assets/promo-small-440x280.png`
- `assets/promo-marquee-1400x560.png`
- `assets/screenshots/01-pinyin-above-text-1280x800.png`
- `assets/screenshots/02-popup-controls-1280x800.png`
- `assets/screenshots/03-tone-display-options-1280x800.png`
- `assets/screenshots/04-advanced-settings-1280x800.png`
- `assets/screenshots/05-traditional-chinese-1280x800.png`

## Privacy policy

Use the public URL where `docs/privacy.html` is hosted. A browser-ready privacy page and Markdown source are included in this repository.

## Support URL

A browser-ready support page is included at `docs/support.html`. Publish the `docs` directory on a public HTTPS site and use that URL in the Chrome Web Store listing.
