# Chrome Web Store submission checklist

## Build and package

- Confirm `npm run check` succeeds.
- Confirm the production ZIP contains `manifest.json` at the ZIP root.
- Confirm the ZIP contains `assets/icons/icon16.png`, `icon32.png`, `icon48.png`, and `icon128.png`.
- Confirm production JavaScript is bundled locally and no external runtime dependency is required.
- Upload the `hanyu-pinyin-reader-<version>-chrome-web-store.zip` release artifact.

## Store listing

- Product name - Hanyu Pinyin Reader
- Category - Education
- Language - English
- Copy the short and detailed descriptions from `listing.md`.
- For each additional language in `localized-listings.md`, choose its locale in the dashboard and add the matching detailed description. The title and summary come from the packaged `_locales` messages.
- Upload `assets/store-icon-128.png`.
- Upload all five 1280 by 800 screenshots.
- Upload `assets/promo-small-440x280.png`.
- Upload `assets/promo-marquee-1400x560.png` as the optional marquee asset.

## Privacy practices

- Copy the single-purpose statement from `listing.md`.
- Add the permission justifications from `listing.md`.
- Declare that remote code is not used.
- Complete the data-use declarations consistently with `privacy-policy.md`.
- Publish `docs/privacy.html` at a public HTTPS URL and enter that URL in the dashboard.
- Do not claim data collection that the current extension does not perform.

## Distribution

Choose the desired visibility and regions in the Chrome Web Store dashboard. Distribution settings are an account-level publishing decision and are not encoded in the extension package.

## Final review

- Test the final ZIP through Chrome's Load unpacked flow using the unzipped package.
- Verify popup controls on at least one Simplified Chinese and one Traditional Chinese page.
- Verify extension behavior on a dynamic page.
- Verify the extension is inactive on protected Chrome pages.
- Verify the store description, privacy declarations, screenshots, and package behavior all describe the same current version.
