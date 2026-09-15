# Privacy Policy for Hanyu Pinyin Reader

Last updated 15 September 2026 for version 1.1.0

Hanyu Pinyin Reader adds pronunciation guides to Chinese webpage text. Conversion takes place in the browser. The extension does not send webpage or selected text to a pronunciation service, the developer, or an analytics provider.

## Information used

The extension reads eligible webpage text to generate Pinyin. It uses the current hostname to apply website preferences. It stores annotation settings, exact-host rules, excluded selectors, and performance preferences. Temporary conversion results remain in memory and are bounded.

## Preference storage and migration

Version 1.1.0 writes new preferences to chrome.storage.local in the browser profile. It does not write new preferences to browser sync storage. Reset clears current settings; removing extension data or uninstalling removes browser-managed local data subject to the browser's behavior.

Earlier versions used chrome.storage.sync. On first use, version 1.1.0 reads that legacy record and copies preferences to the local store. It leaves the old sync record untouched for rollback. Existing synced copies may therefore remain with the browser provider. Resetting the new local settings does not delete those legacy synced copies. Manage old synced extension data through the browser's data controls when needed.

An explicit settings export downloads a JSON file to the user's device. It includes configured domains and selectors. The user controls any subsequent sharing. Import reads a file selected by the user and validates its structure before replacing settings.

## Clipboard and page access

Clipboard writes occur only through a user-requested copy action. Automatic content scripts access ordinary HTTP and HTTPS documents, including permitted frames, to add Pinyin. They skip form fields, editable regions, code, and other excluded content. This requires page access even though no webpage text is sent to a server.

## Permissions

Storage saves preferences. Context menus expose selection actions. Active tab access supports user-initiated page controls. The extension does not request browsing history or collect a visited-page history.

## No advertising or telemetry

The extension has no account registration, advertising, analytics, tracking, telemetry, or data-sale functionality. It does not knowingly collect personal information from children or any other user for the developer. Browser-managed services and previously synced records are separate from extension-operated transmission.

## Third-party software

Production builds bundle pinyin-pro and dictionary data locally, with their license notices. No remote JavaScript or remote dictionary service is used. Any separately supplied offline preview is labelled as a test build and uses its documented local adapter.

## Support

Use the support contact published with the extension. Any information the user deliberately sends in a support request is outside automatic extension processing. Do not send private webpage text or personal information that is not necessary to describe the issue.

## Updates

This policy should be reviewed before publishing changes to data handling. The publisher must host this page at a public HTTPS address and supply a working support contact before store submission.
