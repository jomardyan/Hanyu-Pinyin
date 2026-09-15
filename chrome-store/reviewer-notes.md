# Chrome Web Store reviewer notes

## Purpose

Hanyu Pinyin Reader adds Hanyu Pinyin pronunciation annotations to Chinese text on ordinary webpages. The feature is entirely local and does not transmit page content to a server.

## Suggested review flow

1. Install the packaged ZIP or load the built `dist` directory unpacked.
2. Open a normal HTTP or HTTPS page containing Chinese text.
3. Open the extension popup.
4. Confirm that Pinyin annotations appear above Chinese text by default.
5. Change tone format between tone marks, tone numbers, and no tones.
6. Change segmentation between words and characters.
7. Set the current website rule to Never enable and confirm annotations are removed.
8. Restore the global setting and confirm annotations return.
9. Select Chinese text and use the extension context menu.
10. Open Advanced settings and review appearance, exclusion, and performance controls.

## Network behavior

No user content is transmitted. The production bundle contains the Pinyin conversion library and dictionary data. The extension has no analytics or tracking endpoints.

## Broad website access

Automatic annotation is the extension's core user-facing function. The content script therefore needs to run on ordinary HTTP and HTTPS webpages. Protected browser pages remain inaccessible to the extension.

## Remote code

No remote code is used. Manifest V3 content security policy restricts extension pages to local scripts.
