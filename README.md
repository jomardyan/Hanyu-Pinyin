# Hanyu Pinyin Reader

Chinese reading assistance for Chrome, Edge, and Chromium. The production source bundles pinyin-pro 3.29.4, modern phrase data, and Traditional Chinese mappings. Conversion does not send webpage text to a server.

Version 1.1.0 replaces the earlier page-processing engine. See [the audit report](docs/AUDIT-1.1.0.md) for verified fixes, test results, and remaining limits. No release is claimed to work on every website.

## Main features

- Above-text ruby, hover, after-text, and hidden modes, with word or character display and three tone formats.
- Resumable DOM scanning, bounded conversion chunks, bounded LRU caching, mutation handling, and open Shadow DOM observation and restoration.
- Reversible text annotations, safe selection actions, copy without duplicate Pinyin, and exclusions for code, forms, editors, hidden content, and existing ruby.
- Accessible popup controls, live status, rescan, cache clearing, advanced settings, exact-host rules, validated settings import and export.

Declared Japanese and Korean content is excluded by default. Enable the advanced language option to process Han characters there. Names, rare characters, and ambiguous phrases can still receive imperfect pronunciations.

## Build

Use Node.js 20 or newer and npm. Store artwork needs a CJK-capable system font, such as Noto CJK. No font files are bundled with this repository.

```bash
npm install
npm run check
npm run store:release
```

The repository pins direct dependency versions. There is no committed lockfile, so transitive dependencies are not fully reproducible. The task runner uses npm ci when a lockfile exists and npm install otherwise.

`npm run check` runs the real dependency-backed TypeScript and Vitest checks, builds the extension, validates its files, and runs compiled-worker tests with mocked browser APIs. Browser DOM and UI suites are separate commands.

`npm run build` generates extension icons and writes the production extension to `dist`. Development mode watches TypeScript and static HTML, CSS, manifest, and icon files. Reload the unpacked extension after a rebuild.

```bash
npm run dev
npm run test:backend
npm run test:browser
npm run test:ui
```

For the Python browser suites, install Playwright and its Chromium browser first. A system Chromium executable can instead be selected with CHROMIUM_BIN.

```bash
python -m pip install playwright
python -m playwright install chromium
```

These suites exercise the DOM and UI with mocked Chrome APIs. They do not replace testing an installed extension, actual browser permissions, keyboard commands, cross-origin frames, or a screen reader.

## Make and PowerShell

Both wrappers invoke the same Node task dispatcher and propagate failures.

```bash
make help
make setup
make dev
make run
make run BROWSER=edge
make test
make test-browser
make test-ui
make check
make release
make fixture
make clean
```

```powershell
.\make.ps1 setup
.\make.ps1 run -Browser edge
.\make.ps1 check
.\make.ps1 release
```

The default run target uses Chromium and a dedicated `.browser-profile` directory. Branded Chrome and Edge are opened at their extension management page for manual unpacked loading. Do not assume command-line sideload flags work in current branded browsers. The runner never uses the normal personal browser profile.

Additional tasks include doctor, install, build, run-chrome, run-edge, run-chromium, test-watch, test-backend, typecheck, assets, assets-validate, package, ci, release-files, and clean-all. `package` skips unit tests. `clean-all` also removes dependencies and dedicated test profiles. Neither cleanup command removes source files.

## Install an unpacked build

1. Build the repository and open chrome://extensions or edge://extensions.
2. Enable Developer mode, select Load unpacked, and choose `dist`.
3. Disable older copies of this extension and refresh previously open webpages.
4. Use the popup Rescan action when a page has attached an otherwise unobservable shadow root.

The local compatibility fixture is served on the loopback interface by `make fixture`. It includes long pages, dynamic content, nested shadows, exclusions, and mixed writing systems. File-URL access is not requested.

## Page processing and safety

Each scan job retains a traversal cursor. A batch does not restart from the document head. A bounded count of visits, conversions, and elapsed work controls scheduling. Dictionary initialization or an individual browser/library operation can exceed the target time slice.

The controller observes document and discovered open shadow roots. Extension mutations are isolated from observer delivery. A failed unchanged text node is not retried forever. Disable and settings changes cancel queued work before restoring text.

Selection annotation splits eligible text nodes instead of deleting a range's markup. Removing Pinyin affects touched annotated words, not an entire paragraph. Partial selection of a word removes the guide for that whole word. Site links and formatting are preserved in the tested cases.

Restoration tracks owned wrappers in a WeakMap, restores original text-node identity when safe, and preserves edited base text or inserted elements. It does not trust page-created lookalike attributes as extension ownership.

Native ruby can increase line height or width. The extension does not rewrite arbitrary site overflow and layout rules. A site with fixed-height clipped boxes may still hide guides. Use hover or after-text mode, reduce guide size, or exclude the relevant selector.

## Settings and privacy

Version 1.1.0 stores preferences and exact-host rules in chrome.storage.local. The background worker serializes partial updates to avoid overwriting concurrent edits. Inputs, numeric bounds, colors, selectors, domains, and import schemas are validated.

On first use, the extension imports older chrome.storage.sync settings into the new local store. It leaves the legacy sync record untouched for rollback and does not write new preferences to it. Old synced copies may therefore remain with the browser provider. See [the privacy policy](chrome-store/privacy-policy.md).

Permissions remain storage, contextMenus, and activeTab. Automatic content scripts access ordinary HTTP and HTTPS documents, including permitted frames. This is broad page access and should be explained in the store disclosure. The extension does not request browsing history, analytics, remote JavaScript, or remote text conversion.

## Architecture

`src/pinyin` owns conversion and cache. `src/content` separates resumable scanning, annotation ownership, controller lifecycle, bounded inline context, and selection tools. `src/background` serializes settings mutations and routes commands. `src/shared` defines validated settings and storage messages. Popup and options pages use these APIs rather than writing whole stale settings objects.

The production build includes the repository LICENSE and THIRD-PARTY-NOTICES.txt. The project remains under the Unlicense. Bundled pinyin-pro and dictionary components retain their own MIT notices.

## Release output

```bash
npm run store:release
```

The command writes the following files under `release` after checks pass.

- `hanyu-pinyin-reader-1.1.0-chrome-web-store.zip` with manifest.json at the archive root.
- `hanyu-pinyin-reader-1.1.0-store-assets.zip` with listing materials and public-site templates.
- `SHA256SUMS.txt` with archive hashes.

Packaging rejects previews, missing assets, invalid PNG icons, source maps, symlinks, unsafe paths, and obvious unsafe script patterns. This is a release sanity check, not a complete security proof. No fallback conversion database is silently substituted into a store release.

The existing store graphics generator produces promotional illustrations, including representations of the older interface. Capture current real screenshots and review all listing claims before submitting version 1.1.0. Publish the privacy page at a public HTTPS URL and supply a real support contact. Store acceptance remains subject to the publisher's disclosures and review.

## Compatibility limits

Browser-protected pages, store pages, images, canvas text, closed Shadow DOM, and browser PDF viewers are not covered. An open shadow root attached to an existing host without an observable mutation may need Rescan. Cross-node phrase context is bounded and stops at block or link boundaries. Frameworks that retain and move the original text node can still conflict with DOM annotations. Test the sites you use and exclude incompatible regions.
