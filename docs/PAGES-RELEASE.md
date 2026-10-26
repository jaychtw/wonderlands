# Wonderlands v1.0.0 — complete

**Play: https://jaychtw.github.io/wonderlands/**

**Deployment status: successful and verified.** The owner's local human playtest passed. The earlier local startup difficulty was not a gameplay defect, and this delivery made no gameplay or visual changes.

- [Successful Pages deployment and smoke run](https://github.com/jaychtw/wonderlands/actions/runs/40311862602)
- Deployment commit: `367a1e43db32c6657986b694836aee38efea8804`.
- [Machine-readable deployment verification](../evidence/pages-deployment.json).

GitHub Pages publishes the original `release/Wonderlands-v1.0.0.zip`. Its SHA-256 remains `0cc8d0db1ae0eb263c1c3f004421e15302406ed34dc5d3b5f3cda51e033b8660`. All nine public runtime files were independently fetched over HTTPS and matched against that ZIP. GitHub reports the deployment successful and HTTPS enforced.

The automated public-site smoke passed in isolated desktop and mobile browser contexts: initial load, terrain edit, save/reload, EN/zh-TW switch, layout, and asset integrity. The run's `pages-deployment-smoke` artifact contains the report and screenshots. This was a deployment check, not another human acceptance cycle.

Functionality, art, storage key, and save schema are unchanged. Browser storage is scoped by origin: to bring a local-server world to Pages, use Settings → Export on the local game, then Import on the public game. Existing local saves remain in their original browser origin.

Wonderlands v1.0.0 is complete. The repository includes the deployment workflow for repeatable publication of this release, without introducing further development phases or review gates.
