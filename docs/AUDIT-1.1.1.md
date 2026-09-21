# Version 1.1.1 review

## Verified fixes

- An exclusion on a shadow host or its ancestor now restores annotations inside discovered nested shadow roots.
- Revealing a known shadow host now scans its current content, including text changed while hidden.
- Settings subscriptions start before the initial read. Revision checks prevent older asynchronous reads from replacing newer storage notifications.
- Page suspension and controller destruction invalidate pending reads. Late results cannot restart processing.
- Settings imports reject arrays instead of silently normalizing them to defaults.

The two shadow-root regressions and three lifecycle regressions were reproduced before the fixes. All five pass after the changes.

## Tooling changes

- The root `Makefile` directly defines tool commands and their dependencies. Incremental grouped rules repair missing output and rebuild changed source without repeating unchanged work. `make.mjs` is a thin GNU Make launcher.
- Node and PowerShell launchers read help from the Makefile target comments. PowerShell supports the same browser launch options and uses locked npm installation during automatic setup.
- `setup-browser` installs the pinned Playwright package in a local Python environment, unless an existing environment is explicitly selected.
- `test-all` includes the browser DOM and UI suites. `release-full` requires those checks before packaging.
- Standalone worker and UI tests depend on current build output. Aggregate checks share prerequisite execution.
- A custom extension directory is used directly without rebuilding the default output.
- Cleanup removes generated test results and preserves source files and portable tools.
- CI includes native Windows PowerShell validation and uploads archive hashes with release ZIPs.

## Local validation

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Vitest unit and regression tests | 31 passed |
| Make and launcher tests | 7 passed |
| Compiled worker tests with mocked browser APIs | 11 passed |
| Production build and manifest validation | Passed |
| Store artwork validation | 12 PNG files passed |
| Version 1.1.1 archive generation | Both ZIPs and SHA-256 hashes generated |
| Production dependency audit | No known vulnerabilities reported by npm |
| Python Playwright installation | Passed |
| Chromium download | Blocked by download timeouts and gateway errors |
| Browser DOM and UI suites | Not run locally because Chromium was unavailable |
| Native Windows PowerShell execution | Not available locally, covered by the new CI job |

The dependency audit covers production dependencies only. Browser suites use mocked extension APIs. Installed-extension behavior, browser permissions, closed shadow roots, protected pages, and screen readers still require separate testing. See the README for operating limits and the earlier 1.1.0 review for historical results.
