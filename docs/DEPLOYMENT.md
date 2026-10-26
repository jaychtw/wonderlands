# Wonderlands — run and deploy

The release is a static site: HTML, CSS, JavaScript modules, and bundled illustrations. No backend, API keys, database, build step, or runtime CDN is required.

1. Download `release/Wonderlands-v1.0.0.zip` from the GitHub repository and extract it.
2. Serve the extracted `Wonderlands` folder. With Python 3 installed, run `python -m http.server 4173` in that folder, then open the server on the same computer. `npm start` is equivalent when using the source checkout with Node and Python installed.
3. For phone access on the same trusted network, start the server with `--bind 0.0.0.0`, and open the computer's LAN address and chosen port from the phone. Network/firewall access must allow it.

For a hosted build, upload the extracted folder contents to an ordinary static host that serves `.js` as JavaScript. Keep `src/`, `art/`, and `docs/` relative to `index.html`. It works under a subpath without a build-time base URL. HTTPS is preferred for normal hosting. There is no service worker or offline install requirement.

GitHub Pages is a possible publishing route after the owner authorizes public hosting: publish the root static site from `main` using repository Pages settings, or upload the release folder to an existing approved host. This implementation does not enable Pages, create a public deployment, or assume a URL exists. The repository's check workflow verifies and packages only.

Saves are scoped to the browser's origin (scheme, host and port); moving hosts or changing ports does not move saved games. Use Settings → Export / Import to move them. The server is for local/static delivery, not a hardened production application server.

To recreate the ZIP from source: `python scripts/package.py`. The archive includes no Stage A island, reference illustration, screenshot, test fixture, or development dependency. Run the tests described in the root README before distributing a changed build.
