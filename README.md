# Wonderlands

**BEEP wonders. You create. The world surprises you both.**

A peaceful, playable 16 × 16 ocean-planet terraforming sandbox for desktop and mobile browsers. Paint anywhere, reshape coastlines, connect rivers and mountain ranges, and let BEEP share your discoveries. No costs, timers, or forced goals. English and Traditional Chinese are included.

The Stage A direction was approved with the requirement that the final world be genuinely editable. The game now uses generated cell geometry, independent illustrated sprites, and masked ground materials. It starts with a blank ocean. **The Stage A island illustration and supplied concept are never loaded by the game and are excluded from the release.**

![Actual playable game, painted by automated pointer interactions](evidence/desktop-after.png)

## Play

**[Play Wonderlands online](https://jaychtw.github.io/wonderlands/)** — GitHub Pages, using the unchanged v1.0.0 release.

[Download Wonderlands v1.0.0](release/Wonderlands-v1.0.0.zip), extract it, and serve the extracted `Wonderlands` folder with Python 3:

```sh
python -m http.server 4173
```

Then open the local server's address in your browser. Serve over HTTP; opening `index.html` directly from the filesystem does not support JavaScript modules reliably. No npm install, build, account, or external service is needed to play. From a source checkout, `npm start` runs the same server.

[Play guide / 操作說明](docs/PLAY.md) · [Deployment instructions](docs/DEPLOYMENT.md)

## See the dynamic evidence on GitHub

[Before: blank ocean](evidence/desktop-before.png) · [After: painted world](evidence/desktop-after.png) · [Coastline cut](evidence/desktop-river-cut.png) · [City reverted](evidence/city-reverted.png) · [Mobile gameplay](evidence/mobile-gameplay.png) · [Traditional Chinese touch session](evidence/mobile-zh-TW.png)

[Heart-shaped layout](evidence/arbitrary-heart.png) · [Separate islands](evidence/arbitrary-archipelago.png) · [Second region](evidence/region-two.png)

[Dynamic evidence and test report](docs/VERIFICATION.md) · [Visual compromises against Stage A](docs/VISUAL-COMPROMISES.md)

## Included

- All 256 cells editable, mouse/touch drag painting with connected diagonal strokes, keyboard editing, zoom and scroll-to-pan.
- Coastline union geometry, continuous river paths and mouths, relief chains, contextual port / riverside / fortress / city appearances, compatible manual overrides and Auto.
- 20 permanent discoveries, optional recipe-based BEEP ideas, retroactive transformations, and a second savanna region after any ten distinct discoveries. The unlock condition is hidden in the game until earned.
- Independent region maps, bounded undo/redo per session, confirmed clear, versioned browser-local autosaves, validated import/export, settings and EN/zh-TW UI.
- Reduced motion, mute, cell guides, semantic controls, and keyboard board input.

## Verify and package

Node 20+ runs the dependency-free rule tests:

```sh
npm test
```

Browser tests require Playwright 1.62.1 and Chromium. In the prepared cloud environment both are installed. Elsewhere:

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
npm run test:browser
```

The suite starts and stops its own local test server. It uses `/usr/bin/chromium` when available, otherwise Playwright's bundled browser. `CHROMIUM_PATH` overrides the executable. In restricted cloud sandboxes, browser execution may require the platform's normal elevated execution route. Run `python scripts/package.py` to reproduce the static release archive. CI runs logic checks, browser checks, and packaging; this handoff does not claim that a remote CI run has completed.

Production code is in `src/`, the sole achievement recipe registry is `src/core.js`, and unchanged source handoff documents are in `docs/handoff/`. `proof/` preserves the historical Stage A references and captures; they are not gameplay evidence. The app has no runtime network dependency beyond loading its own files.

The owner’s local human playtest passed. GitHub Pages deployment completes the bounded personal/experimental v1.0.0 release; no gameplay fixes or new human QA cycle were requested. See the [deployment report](docs/PAGES-RELEASE.md) for the hosted smoke result. Physical-device testing, Safari/Firefox coverage, and commercial-release certification are not claimed.
