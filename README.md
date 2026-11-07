# mattzago.com

This repository serves a blank home page at https://mattzago.com/ and the Tino Zago gallery at https://mattzago.com/tinozago/.

## Publish with GitHub Pages

1. Create a new GitHub repository (for example, mattzago-site). If preventing bulk downloads matters, keep the repository private: a public repository exposes every image separately from the website. Private-repository GitHub Pages requires an eligible GitHub plan; a private source repository does not by itself make the published website private.
2. Put the contents of this folder at the repository root, including index.html, .nojekyll, and the entire tinozago folder.
3. Commit and push to main.
4. In repository Settings > Pages, select Deploy from a branch, main, /(root), then Save.
5. Set Custom domain to mattzago.com and Save. If GitHub reports the domain is already in use, remove its Pages association from the archived repository first; unarchive that old repository if necessary to edit its settings.
6. Enable Enforce HTTPS when available.

DNS was checked November 6, 2026 and already resolves to GitHub Pages. No additional DNS record is needed for /tinozago/.

The root index.html is intentionally blank. The gallery's index.html is inside tinozago/.
The gallery contains 125 catalogue records and 125 images. Catalogue information began with the October 18, 2026 snapshot; drawing photographs, title annotations and materials descriptions were reviewed November 6, 2026. Confirmed material and support details use the catalogue and matching artwork captions on tinozago.com. Unconfirmed materials are omitted. The Enigma #2 panels retain the catalogue year 2013; the artist website dates the matching ensemble 2014, which remains unresolved. It does not automatically sync with Google Sheets.
Images are served with the site. Select a work, then select its photo or View larger photo to open a larger local image. The viewer supports Fit to screen and Actual size; larger files load only when opened. Google Drive URLs are excluded from the published catalogue. Storage locations and working-copy notes are excluded. The unresolved black-and-white A/B distinction remains in the artwork details.

This package has been prepared locally; nothing has been published.

## Crawler policy and its limits

The domain-root robots.txt disallows all crawling, including ordinary search crawlers, and explicitly names several AI crawlers and fetchers. Both HTML pages also include noindex, nofollow, noimageindex, and nosnippet metadata.

These rules are voluntary signals, not an access control. A crawler blocked by robots.txt cannot read the page's noindex metadata; a URL discovered elsewhere can therefore still appear in search results. The metadata is an additional signal only for clients that retrieve the page. User-triggered fetchers and noncompliant scrapers may ignore robots.txt.

This policy covers mattzago.com, not copies in a public GitHub repository, raw GitHub file URLs, Google Drive originals, or other domains. Do not treat this package as scrape-proof.

For additional enforcement, traffic must pass through a service that blocks identified bots. Cloudflare's current controls are under Security > Settings > Bot traffic > AI Crawler and Agent access policies; choose Block for Search, Agent, and Training. DNS hosting alone does not apply those controls. Cloudflare configuration has not been changed by preparing this package, and public origins or alternate hostnames can remain bypass routes.

If anonymous access must be prevented, require authentication for both the pages and the images and protect every serving hostname. Authorized viewers can still save images they can view.

References checked November 6, 2026:
- https://developers.google.com/search/docs/crawling-indexing/robots/intro
- https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/
