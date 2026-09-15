# Hanyu Pinyin Reader 1.1.0 audit

Audit date 15 September 2026

## Basis

Reviewed the repository at commit 7cee2944cb9e5e45c4a43a2e97bd55075f7a8502 and the previously supplied offline-fallback-fixed ZIP. The ZIP was a separate fallback conversion build, not the repository's pinyin-pro bundle.

## Implemented corrections

| Area | Previous problem | Change |
| --- | --- | --- |
| Large pages | Continuation rescanned already visited content | Persistent traversal cursors, bounded batches and cancellation |
| Dynamic content | Missing observation and cleanup inside shadows | Per-root styles, nested open-root observation and restoration |
| Selection | Range deletion destroyed nested page markup | Text-only splitting, saved selection, partial guide removal |
| Restoration | Stale stored strings could replace page edits | WeakMap ownership, current-base preservation, original-node reuse |
| Exclusions | Nested code, plaintext editors, hidden styles and non-Chinese contexts were missed | Ancestor and shadow-host checks, language opt-in, visibility rules |
| Pinyin | Traditional mapping, mixed text, and split inline context gaps | Explicit dictionaries, contextual character alignment, bounded chunks |
| Settings | Whole-object sync writes and unchecked values | Serialized local-store mutations, partial patches, validation and migration |
| UI | Stale state, silent failures and inaccessible toggle | Accessible controls, effective host status, errors, rescan and cache controls |
| Build | Static watch omissions, missing notices and packaging gaps | Static-file watch, license inclusion, version and PNG validation, hashes |
| Automation | Duplicated wrappers and unsafe path handling | Shared task runner, loopback fixture server, confined test profiles |

The old base64 text file misnamed icon16.png is removed from tracking. The build regenerates actual PNG files. No unrelated branch or repository history is rewritten.

## Executed validation

41 targeted checks passed in this environment.

- 21 Chromium DOM regression checks on the implemented source compiled with the explicitly labelled offline preview conversion adapter.
- 11 compiled-background-worker tests with mocked chrome.storage, messaging, context menu, and command APIs.
- 9 Chromium popup and options checks with mocked Chrome APIs.

The DOM suite covers 2,300 text nodes, dynamic insertion, hidden reveal, details, nested shadows, repeated toggles, link listeners, text edits, surrogate preservation, safe selections, isolated failures, inline context, partial removal, and page-created ownership lookalikes.

Application TypeScript was checked using the installed compiler and narrow audit-only declarations for external APIs. Preview JavaScript syntax checks passed. Make help and the environment checker ran successfully.

## Added tests not executed here

The committed Vitest suites cover settings, cache, DOM, and the actual pinyin-pro adapter, including Traditional polyphonic words. The real dependency-backed Vitest and TypeScript checks were not run because the npm dependencies could not be installed in this environment. The browser and UI suites are also runnable against a production build after dependencies are installed.

## What was not verified

The exact npm run store:release command did not complete here. Network access to npm and GitHub from the execution container was unavailable. Browser policy prevented testing an installed unpacked extension and localhost navigation. About-blank browser DOM tests and mocked API tests were used instead. No claim is made that a GitHub Actions release or a Chrome Web Store review passed.

Current branded Chrome and Edge do not reliably accept old command-line sideload flags. The launcher now distinguishes manual branded-browser installation from Chromium automation.

## Remaining checks before a public release

Run npm install, npm run store:release, npm run test:browser, and npm run test:ui on a machine with dependency access. Test the actual installed extension in Chrome and Edge, keyboard commands, real clipboard permissions, cross-origin frames, screen readers, and the target news site. Refresh store screenshots to match the new interface and publish the privacy and support pages.

The offline preview ZIP is for compatibility testing only. It deliberately uses a different local dictionary adapter and cannot establish production pronunciation accuracy. Production packaging rejects this preview instead of silently distributing it as a store build.

## Known boundaries

Closed roots, protected browser pages, images, canvas text, and browser PDF viewers remain unsupported. Unobservable late attachShadow calls require Rescan. Ruby layout can still be clipped by site CSS. Phrase context across independent links or blocks is not joined. Highly stateful frameworks retaining original text references may require excluded selectors. The audit does not guarantee absence of every possible defect.

## External references consulted

- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://playwright.dev/docs/chrome-extensions
- https://pinyin-pro.cn/use/traditional.html
- https://pinyin-pro.cn/en/use/segment.html
- https://github.com/vitest-dev/vitest/security/advisories/GHSA-9crc-q9x8-hgqq
- https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99

Direct esbuild and Vitest versions were raised to the advisory fix versions. A complete npm audit and transitive dependency review remain outstanding. No lockfile is invented.
