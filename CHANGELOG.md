# Changelog

## Unreleased

Fixed website rules being ignored in `about:blank` and `srcdoc` frames. Those frames inherit the parent origin but report an empty hostname, so an "Always enable" or "Never enable" rule never matched them even though the manifest opts into them. The content script now resolves the nearest ancestor origin.

Fixed the popup "Reset appearance" button also resetting placement, annotation unit, and tone style, which are outside the Appearance section. Fixed the popup status line reporting the processed text-node count under a "segments processed" label; it now reports converted segments.

The popup state and the options footer now read the version from the manifest instead of repeating a literal, so they cannot drift from a version bump. The background worker uses the shared `MAX_RULES` constant instead of a duplicated limit.

Pronunciation is now withheld when the conversion library returns a syllable count that does not match the character count, instead of attributing misaligned syllables to the wrong characters.

Fixed the UI regression suite failing to start on Windows, where `Path.read_text` used the cp1252 locale encoding and could not decode the UTF-8 popup markup. Both Python suites now read and write UTF-8 explicitly and fall back to an installed branded Chrome when neither `CHROMIUM_BIN` nor Playwright's Chromium is present. Added regression coverage for each fix above.

CI now installs with `npm ci` against the committed lockfile and runs the browser DOM and UI suites, which no automated job previously executed. Corrected the README claim that no lockfile is committed.

## 1.1.0 - 15 September 2026

Replaced root rescanning with resumable traversal. Added complete lifecycle handling for discovered open shadows, safe selection annotation and partial removal, current-text restoration, bounded conversion and caching, Traditional mappings, and inline word context.

Moved new settings to validated local storage with serialized background mutations. Added accessible popup and options controls, status, rescan, cache reset, language behavior, and settings import/export.

Hardened release checks, license inclusion, compressed packaging, checksums, static-file watching, browser launch behavior, local fixture serving, and shared Make/PowerShell tasks. Added DOM, UI, background, settings, cache, and pronunciation regression suites.

See docs/AUDIT-1.1.0.md for executed results and unverified production checks. A preview package is not a production store release.

## 1.0.0

Initial extension and separate offline fallback preview. The first page-processing fix continued scanning after the initial text-node batch.
