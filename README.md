# Hanyu Pinyin Reader

Chinese reading assistance for Chrome, Edge, and Chromium. The production source bundles pinyin-pro 3.29.4, modern phrase data, and Traditional Chinese mappings. Conversion does not send webpage text to a server.

Version 1.1.1 fixes shadow-root restoration and page lifecycle races, rejects malformed settings imports, and consolidates developer commands. Version 1.1.0 replaced the earlier page-processing engine. See [the current review](docs/AUDIT-1.1.1.md) for fixes, validation, and remaining limits, and [the earlier audit](docs/AUDIT-1.1.0.md) for the engine redesign. No release is claimed to work on every website.

## Main features

- Above-text ruby, hover, after-text, and hidden modes, with word or character display and three tone formats.
- Resumable DOM scanning, bounded conversion chunks, bounded LRU caching, mutation handling, and open Shadow DOM observation and restoration.
- Reversible text annotations, safe selection actions, copy without duplicate Pinyin, and exclusions for code, forms, editors, hidden content, and existing ruby.
- Accessible popup controls, live status, rescan, cache clearing, advanced settings, exact-host rules, validated settings import and export.

Declared Japanese and Korean content is excluded by default. Enable the advanced language option to process Han characters there. Names, rare characters, and ambiguous phrases can still receive imperfect pronunciations.

## Quick start

Use GNU Make 4.3 or newer, Node.js 20 or newer, and npm. The root `Makefile` owns the build recipes and dependency graph. Run commands from the repository root. Check the installed Make version with `make --version`. On Windows, install GNU Make and add it to PATH, or set `MAKE_BIN` to its executable before using the PowerShell launcher.

```bash
make setup
make check
make run BROWSER=chromium
```

On Windows, the PowerShell wrapper can download a SHA-256-verified portable Node.js archive into `.tools` when a suitable installation is unavailable. GNU Make installs npm dependencies when the lockfile or package manifest changes, or when the installation marker is missing. Setup uses `npm ci` with the committed lockfile. Downloads require internet access. Help works offline without Node.js.

```powershell
.\make.ps1 help
.\make.ps1 setup
.\make.ps1 run -Browser edge
```

The repository includes Noto Sans CJK SC for store artwork. A separate CJK system font is not required. The font is used by build tools and is not included in the extension ZIP.

## Consolidated development commands

`Makefile` contains explicit recipes for installation, compilation, testing, asset generation, validation, and packaging. It calls the underlying tools directly. `make.mjs`, `make.ps1`, and npm commands are thin launchers that invoke GNU Make. Help is read from comments beside the actual Make targets, with no separate task registry. Use `make help` for the complete list. `npm run make -- check` and `node make.mjs check` invoke the same Make graph.

| Task | Purpose |
| --- | --- |
| `help`, `doctor` | List commands or report installed tools |
| `setup`, `dependencies`, `install` | Verify tools, install changed dependencies, or force a locked reinstall |
| `setup-browser` | Install Python Playwright and Chromium for browser tests |
| `build`, `rebuild`, `dev`, `build-validate` | Build changed output, force a rebuild, watch source, or validate production output |
| `run`, `run-chrome`, `run-edge`, `run-chromium` | Build and launch a dedicated browser profile |
| `test`, `test-watch`, `typecheck` | Run unit tests, watch tests, or check TypeScript |
| `test-tooling` | Check CLI failures, cleanup, and custom build launches |
| `test-backend`, `test-ui` | Bring output up to date and test the worker or popup and options pages |
| `test-browser` | Build the DOM harness and run browser regressions |
| `check` | Run TypeScript, unit, tooling, production build, validation, and worker checks |
| `test-all` | Run `check` plus the browser DOM and UI suites |
| `icons`, `promo`, `screenshots` | Generate icons, promotional artwork, or screenshot illustrations separately |
| `assets`, `store-generate` | Generate all store artwork |
| `assets-validate`, `store-validate` | Validate generated store artwork |
| `package` | Build, validate, and package without running tests |
| `release`, `store-release` | Run `check`, then generate, validate, and package store materials |
| `release-full` | Run `test-all`, then generate, validate, and package store materials |
| `ci` | Install npm dependencies, then run `release` |
| `fixture` | Serve the local compatibility page |
| `release-files` | List generated release files |
| `clean`, `clean-all` | Remove generated output, optionally dependencies and test profiles |

Make tracks source, manifest, locale, icon, and dependency changes. An unchanged `make build` does no work. Grouped output rules rebuild the bundle once when an input changes or an expected output is missing. Production builds discard development source maps. `make rebuild` forces regeneration. Worker and UI tests depend on current build outputs. Shared prerequisites execute once per invocation. Release prerequisites run in order and stop on failure, including when `-j` is supplied. Release commands create local archives only. They do not publish to a browser store or GitHub.

```bash
make check
make setup-browser
make test-all
make release-full
make fixture
```

The fixture runs at `http://127.0.0.1:8080/sample.html`. Set `PORT` to change the port. In another terminal, launch the browser against it.

```bash
node make.mjs run --browser chromium --url http://127.0.0.1:8080/sample.html
make run BROWSER=edge URL=http://127.0.0.1:8080/sample.html
```

Browser launch options are `--browser`, `--dist`, `--profile`, `--url`, and `--binary`. Make equivalents are `BROWSER`, `DIST`, `PROFILE`, `URL`, and `BINARY`. PowerShell equivalents are `-Browser`, `-Dist`, `-Profile`, `-Url`, and `-Binary`. For launch targets, a custom `DIST` selects an already built extension directory containing `manifest.json`. It does not change the build output location. Profiles must be beneath `.browser-profile`.

The default browser is Chromium. Branded Chrome and Edge open their extension management page for manual unpacked loading. Development mode watches TypeScript and static UI files. Reload the unpacked extension after rebuilding.

`clean` removes `dist`, `release`, `.test-build`, `coverage`, browser result JSON files, and UI test screenshots. `clean-all` also removes `node_modules` and `.browser-profile`. Both preserve source files, generated store artwork, and portable tools in `.tools`.

## Browser test setup

Install Python 3.9 or newer, then run the shared setup command.

```bash
node make.mjs setup-browser
node make.mjs test-all
```

Setup creates `.tools/python` and installs the Playwright version pinned in `requirements-browser.txt`. Browser test commands detect that environment automatically. `PYTHON_BIN` selects an existing Python executable and setup installs into that environment instead. `CHROMIUM_BIN` selects an existing Chromium executable and skips the browser download. On Linux, Chromium may also require system libraries. Install the dependencies reported by Playwright if launch fails. CI installs them with `python -m playwright install --with-deps chromium`.

The browser suites exercise real DOM rendering and compiled UI with mocked Chrome APIs. They do not replace installed-extension testing of permissions, keyboard commands, cross-origin frames, or screen readers. The Windows PowerShell bootstrap and GNU Make integration also need a native Windows smoke test.

## Install an unpacked build

1. Build the repository and open chrome://extensions or edge://extensions.
2. Enable Developer mode, select Load unpacked, and choose `dist`.
3. Disable older copies of this extension and refresh previously open webpages.
4. Use the popup Rescan action when a page has attached an otherwise unobservable shadow root.

The local compatibility fixture is served on the loopback interface by `make fixture`. It includes long pages, dynamic content, nested shadows, exclusions, and mixed writing systems. File-URL access is not requested.

## Page processing and safety

Each scan job retains a traversal cursor. A batch does not restart from the document head. A bounded count of visits, conversions, and elapsed work controls scheduling. Dictionary initialization or an individual browser/library operation can exceed the target time slice.

The controller observes document and discovered open shadow roots. Extension mutations are isolated from observer delivery. A failed unchanged text node is not retried forever. Disable and settings changes cancel queued work before restoring text. Exclusion changes restore discovered nested shadow roots. Revealing a known shadow host queues its current content again. Delayed settings responses cannot restart a suspended or destroyed controller or replace a newer storage notification.

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

- `hanyu-pinyin-reader-1.1.1-chrome-web-store.zip` with manifest.json at the archive root.
- `hanyu-pinyin-reader-1.1.1-store-assets.zip` with listing materials and public-site templates.
- `SHA256SUMS.txt` with archive hashes.

Packaging rejects previews, missing assets, invalid PNG icons, source maps, symlinks, unsafe paths, and obvious unsafe script patterns. This is a release sanity check, not a complete security proof. No fallback conversion database is silently substituted into a store release.

The existing store graphics generator produces promotional illustrations, including representations of the older interface. Capture current real screenshots and review all listing claims before submitting version 1.1.1. Publish the privacy page at a public HTTPS URL and supply a real support contact. Store acceptance remains subject to the publisher's disclosures and review.

## Compatibility limits

Browser-protected pages, store pages, images, canvas text, closed Shadow DOM, and browser PDF viewers are not covered. An open shadow root attached to an existing host without an observable mutation may need Rescan. Cross-node phrase context is bounded and stops at block or link boundaries. Frameworks that retain and move the original text node can still conflict with DOM annotations. Test the sites you use and exclude incompatible regions.
