# Changelog

## 1.1.0 - 15 September 2026

Replaced root rescanning with resumable traversal. Added complete lifecycle handling for discovered open shadows, safe selection annotation and partial removal, current-text restoration, bounded conversion and caching, Traditional mappings, and inline word context.

Moved new settings to validated local storage with serialized background mutations. Added accessible popup and options controls, status, rescan, cache reset, language behavior, and settings import/export.

Hardened release checks, license inclusion, compressed packaging, checksums, static-file watching, browser launch behavior, local fixture serving, and shared Make/PowerShell tasks. Added DOM, UI, background, settings, cache, and pronunciation regression suites.

See docs/AUDIT-1.1.0.md for executed results and unverified production checks. A preview package is not a production store release.

## 1.0.0

Initial extension and separate offline fallback preview. The first page-processing fix continued scanning after the initial text-node batch.
