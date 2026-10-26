# Wonderlands — run and deploy

Public playable URL: **https://jaychtw.github.io/wonderlands/**

The owner confirmed the local human playtest passed and authorized GitHub Pages deployment only. `.github/workflows/pages.yml` extracts the existing `release/Wonderlands-v1.0.0.zip`, uploads that exact build, and deploys it through GitHub Actions. Application files, release ZIP, storage key, and save schema are unchanged.

The release is a static site: HTML, CSS, JavaScript modules, and bundled illustrations. No backend, API keys, database, build step, or runtime CDN is required.

1. Download `release/Wonderlands-v1.0.0.zip` from the GitHub repository and extract it.
2. Serve the extracted `Wonderlands` folder. With Python 3 installed, run `python -m http.server 4173` in that folder, then open the server on the same computer. `npm start` is equivalent when using the source checkout with Node and Python installed.
3. For phone access on the same trusted network, start the server with `--bind 0.0.0.0`, and open the computer's LAN address and chosen port from the phone. Network/firewall access must allow it.

For a hosted build, upload the extracted folder contents to an ordinary static host that serves `.js` as JavaScript. Keep `src/`, `art/`, and `docs/` relative to `index.html`. It works under a subpath without a build-time base URL. HTTPS is preferred for normal hosting. There is no service worker or offline install requirement.

The repository uses GitHub Actions as its Pages publishing source. The Pages workflow deploys on an update to the release ZIP or deployment configuration, or via a manual workflow dispatch. Its post-deployment smoke test verifies the runtime file hashes against the ZIP, then checks desktop/mobile loading, an edit, save/reload, language switching, and layout in isolated browser contexts. The deployment and smoke run is linked in [PAGES-RELEASE.md](PAGES-RELEASE.md).

Saves are scoped to the browser's origin (scheme, host and port); moving hosts or changing ports does not move saved games. Use Settings → Export / Import to move them. Your local-server save does not automatically appear on the Pages origin; export locally and import on Pages to carry it over. The published game retains the same save behavior. The server is for local/static delivery, not a hardened production application server.

To recreate the ZIP from source: `python scripts/package.py`. The archive includes no Stage A island, reference illustration, screenshot, test fixture, or development dependency. Run the tests described in the root README before distributing a changed build.

The ZIP remains the original tested v1.0.0 artifact; its bundled documentation predates the authorization to deploy. The current repository documentation and deployment report record the hosted release status.
