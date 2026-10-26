# Wonderlands — Game Design Document

**Version:** 1.1 — titled implementation handoff  
**Date:** 2026-10-26  
**Game title:** Wonderlands (approved creative title; verify name/trademark availability before public or commercial release)  
**Suggested repository:** `wonderlands` (check repository availability)  
**Platforms:** Desktop browser and mobile browser  
**Primary language:** English; full Traditional Chinese (zh-TW) localization from the start  
**Project model:** Human-led design → one human art-direction acceptance → autonomous implementation, automated QA, and bounded release.

## 1. Creative north star

> **Build a world at your own pace. The more you experiment, the more the world reveals.**

A peaceful, intuitive, geographically scaled ocean-planet terraforming sandbox called **Wonderlands**. The name captures both the worlds players create and BEEP’s habit of wondering aloud about unexpected possibilities. The player is a space colonist with near-unlimited terraforming technology and a cheerful floating robot companion, **BEEP**. Starting with a blank sea, the player paints terrain and settlements on a bounded grid. Adjacent tiles seamlessly connect; certain arrangements unexpectedly transform into coherent geographical features and civilizations. Achievements celebrate discoveries, permanently unlock optional possibilities, and eventually reveal a second themed region. There is **no winning, losing, scarcity, upkeep, happiness score, forced quest chain, or obligation to progress**.

**Three coequal ways to enjoy the game:** (1) sculpting a beautiful or recognizable island, (2) experimenting with combinations, (3) discovering hidden reactions. Players may remain forever at the simplest stage.

### Title and voice

**Wonderlands** is the in-game title, splash-screen name, browser page title, README name, and release identity. **Ocean Planet** may remain only as a descriptive setting phrase, never as the project title or user-facing product name. The title’s double meaning—wonder as curiosity and wonder as amazement—should inform BEEP’s voice and discovery moments. Suggested tagline: **“BEEP wonders. You create. The world surprises you both.”** A possible opening line: “Commander, an entire ocean planet! I wonder what we could make of it…” Avoid overusing the pun in every dialogue.

## 2. Non-negotiable product principles

1. **Canvas first.** Every basic tile is usable immediately and can be freely placed, replaced, or erased. No money, timers, construction costs, or survival mechanics.
2. **Visible controls; hidden possibilities.** Tile selection and editing are obvious. Discovery recipes and future unlocks are not disclosed upfront.
3. **Content awareness is bidirectional.** Placing or removing any tile re-evaluates affected neighbors and relevant larger patterns. Rivers join into continuous courses, shorelines form naturally, and settlement appearances respond to context regardless of placement order.
4. **Automatic by default, manually overridable.** Contextual appearance chooses a sensible default, but the player can cycle through compatible visual variants for a selected feature. Overrides must not break underlying map logic; resetting to Auto is always possible.
5. **Achievements persist.** Once unlocked, trophies, recipes, and capabilities remain available even if the player dismantles the triggering arrangement or starts another region.
6. **BEEP invites, never directs.** Optional side-quest-like hints based on near-miss achievement states; no mandatory quest acceptance, nagging, or progress policing.
7. **Prosperity without optimization.** All inhabited regions are content and thriving by default; the world celebrates tiny settlements as much as cities.
8. **Geographic scale.** The game depicts regions, not individual buildings or citizens. Assume an evocative ~100 km per cell, not literal geospatial accuracy. Visual symbols and elevation may be exaggerated for legibility.
9. **Environmental continuity.** The editable canvas has crisp interaction bounds, while ocean, atmosphere, sky, clouds, and UI art visually extend around it. No generic disconnected solid-color application shell.
10. **Ambitious art direction; bounded production.** Use the supplied concept as the quality aspiration, not as a promise of pixel-perfect reproduction. Reduce nonessential scope before sacrificing the coherent illustrated aesthetic.

## 3. Core play and interface

### 3.1 Board

- **16 × 16 cells (256 total)**, initially ocean. Board is fixed-size for v1; no expandable infinite world.
- Approximately **50 × 50 logical pixels per cell**, yielding an 800 × 800 logical editing board; renderer may scale/resample for device DPI and responsive viewports. Logical pixels are not mandatory physical pixels.
- **Orthogonal adjacency (N/E/S/W)** governs connected landmasses, river networks, village clusters, and recipe evaluation unless a particular recipe explicitly states otherwise. Diagonals may affect visual blending but not connectivity rules.
- Terrain silhouettes should be recognizably drawable (e.g. approximate Taiwan, Japan, New Zealand, hearts, spirals) within grid limits; no claim of geographic fidelity.
- The ocean is both blank canvas and eraser. Users can place land anywhere, including isolated cells. No restriction on disconnected islands.
- One active region at a time; multiple region save states persist locally.

### 3.2 Input

- Select a tile from a **palette directly below the board**, then click/tap cells to place it.
- Hover/selection preview on desktop; selected-cell indication and touch-safe feedback on mobile.
- Support **drag painting** with mouse/touch where feasible; prevent accidental browser scrolling during an intentional board drag.
- Undo/redo with sensible bounded history; clear/reset requires confirmation. Save automatically on changes and provide an explicit save affordance if useful.
- Zoom/pan on small screens for precise placement, while retaining an accessible overview; do not let mobile zoom distort hit testing.
- Clicking/tapping a placed feature may open a compact detail panel with a contextual variant selector: **Auto / Variant A / Variant B**, only when supported.
- Achievements, discovery journal, region selection, and settings live in a compact header or side affordance. Keep board dominant.
- Palette begins with only unlocked options; new tile tools appear visibly on unlock. Do not spoil all future surprises with an exhaustive grid of locked slots.

### 3.3 Starting palette

| Tool | Core behavior |
|---|---|
| Plain / Land | Creates land, seamless shorelines and inland grassland. |
| Hill | Forms gentle rolling uplands; blends into adjacent plains and hills. |
| Mountain | Creates mountain regions and continuous ridges. |
| River | Creates a connected river course with bends, junctions, and mouths; not counted as land for the 2×2 island achievement. |
| Village | Creates a settlement-region marker; context-aware coastal, mountain, river, and cluster appearances. |
| Ocean / Erase | Restores a cell to sea; updates all dependent geography. |

**Interpretation of river cells:** Rivers are a waterway overlay/terrain class on the grid; a river cell does not count as a solid-land cell for landmass achievements. River segments may cross a broader landmass visually. Render joins, mouth transitions, and adjacent shorelines plausibly without requiring hydrological simulation. The team may choose an internal overlay representation if it preserves the player's simple one-tool-per-cell mental model.

### 3.4 Content-aware rendering and structures

Implement a deterministic tile adjacency / autotiling system, including at minimum:

- Coastline continuity: corner, edge, interior, isolated land, bays, and peninsulas. Avoid visually obvious square seams.
- Hills and mountains form coherent chains or relief masses instead of repetitive isolated sprites.
- River courses automatically become straight runs, bends, junctions, endpoints, and sea mouths; updating either end recomputes the whole relevant section.
- Village by sea → **port-themed settlement** (may use an achievement). Village enclosed by mountains → **fortress-themed settlement** when recipe met. Connected village clusters may transform into **city-themed regions** when both spatial and progression conditions are met.
- Combined contexts should choose a stable deterministic priority (e.g., explicit user override > city > fortress > port > river settlement > ordinary village), with manual variant choice among valid alternatives.
- A 2×2 village cluster visually occupies a coherent regional footprint, not four disconnected icons; removing a village reverts the appearance if recipe is no longer satisfied.
- Decorative features (cultivation textures, region-scale roads, settlement density, light effects) may emerge contextually; no individual farm or building simulation is required.

**Visual rule:** Feature appearance can extend beyond its logical cell; hit boxes and recipe evaluation remain grid-aligned. Avoid overlap that obscures neighboring terrain or click targets.

## 4. Progression, discovery, and achievements

### 4.1 Core logic

- Every achievement has a stable unique ID, trigger predicate, optional near-miss predicate, optional unlocks, localized title/description, BEEP celebration and optional hint sequence.
- Evaluate achievement conditions after relevant edits and on save-load migration. Record permanent first unlock; avoid duplicate rewards.
- **Retroactive transformations:** When an achievement unlocks a capability, immediately re-evaluate all existing map arrangements. A qualifying city cluster can become a city without the player dismantling/rebuilding it.
- Not every trophy needs a reward; some celebrate whimsical geography. No grind-heavy quantity targets.
- Journal records unlocked discoveries and their reproduction recipes. Unknown discoveries should remain undisclosed or show only broad categories, not precise formulas.
- Near misses never block placing tiles; they only affect BEEP hints.

### 4.2 Proposed achievement catalogue (v1 target: 16–20)

| ID | Achievement | Unlock condition | Reward / consequence |
|---|---|---|---|
| A01 | One Small Patch for Mankind | Place first solid-land tile | Trophy; opening celebration |
| A02 | Now That's an Island! | Any orthogonally connected 2×2 block of solid land (plain/hill/mountain; no river) | Trophy; reveal that new possibilities can unlock; optional Beach tool |
| A03 | Civilization Can Thrive Here! | Place first village | Trophy |
| A04 | River Is the Mother of Civilization | Place first river cell | Trophy |
| A05 | Land Ho! | Reach one connected landmass of ≥10 solid-land cells | Trophy |
| A06 | A River Runs Through It | One connected river network of ≥5 river cells | Trophy; optional river decoration variant |
| A07 | Reach for the Sky | Three connected mountain cells | Trophy; optional Snowcap appearance |
| A08 | A Port of Call | Village adjacent orthogonally to ocean | Trophy; port visual variant |
| A09 | Highland Hospitality | Village adjacent to mountain | Trophy |
| A10 | Mountain Stronghold | Village enclosed by mountains on at least three of four cardinal sides | Trophy; fortress contextual variant |
| A11 | We Are Not Alone | Three village cells anywhere | Trophy |
| A12 | Neighbors! | Two orthogonally adjacent villages | Trophy |
| A13 | Growing Together | Four villages forming a 2×2 block | Trophy; unlock **urbanization potential**, not necessarily immediate city |
| A14 | A City Is Born | A 2×2 village cluster and a connected solid-land mass of ≥25 cells on its region | Trophy; city transformation capability; existing qualifying clusters update immediately |
| A15 | Archipelago Architect | Three separate connected solid-land masses of ≥4 cells each | Trophy |
| A16 | The Great Divide | A connected mountain range of ≥5 cells | Trophy |
| A17 | From Mountains to Sea | One connected river network touches a mountain-adjacent cell and ocean-adjacent cell | Trophy |
| A18 | A Little Bit of Everything | Place all five initial non-ocean tile types at least once | Trophy; optional decorative tile |
| A19 | A Whole New World | ≥50 non-ocean cells currently placed | Trophy |
| A20 | Second Thoughts | Replace an occupied cell with another terrain type | Trophy |

**Recipe tuning:** This is a proposed, testable catalogue rather than immutable lore. Codex may adjust thresholds for achievable, visually intelligible discovery, while retaining the user's named examples and the 10-distinct-achievement region unlock. Keep a single documented recipe registry. Avoid unreachable conditions (especially for river/mountain adjacency), accidental double-counting, and contradictory predicates.

### 4.3 Second region unlock

- A hidden meta-achievement, **New Horizon**, unlocks on **any 10 distinct earned achievements**, not ten prescribed achievements.
- Do **not** announce the 10-achievement requirement upfront. On unlock, BEEP congratulates the player using their chosen display name (or neutral "Commander" if blank) and introduces a **second region of the same ocean planet**.
- The second region is a distinct **predetermined** visual theme, inspired by different climatic/geographic environments. E.g. Region 01 lush temperate/subtropical island atlas; Region 02 warm savanna/ochre-earth relief map. Avoid caricatures or claims of continent-wide cultural uniformity.
- Same 16×16 board, tools, discovery logic, and controls. Different palette/terrain textures, ocean/sky lighting, and compatible settlement iconography. Separate saved map; shared achievements/unlocks.
- **No third region in v1.** No second planet or novel biome mechanics required. The second theme should be visually meaningfully different but architecturally cheap.
- Player may continue editing Region 01 indefinitely; Region 02 is a new creative option, not a higher difficulty level.

## 5. BEEP: optional curiosity catalyst

BEEP is a cheerful companion with concise, localized lines and a small animated presence beside—not over—the editable board. Not a traditional help overlay, mission manager, emotional classifier, or generative AI chatbot.

**Priority:** first-time discovery celebration > second-region reveal > contextual near-miss suggestion > occasional ambient appreciation. Respect cooldowns; do not interrupt continuous painting. Offer a dismissible **BEEP's Ideas** panel for revisiting suggestions.

**Hint triggers:** Derive from achievement definitions, not behavioral inference. Example: 2×2 villages present but connected landmass <25 → near miss for city. A few staged lines can progress from evocative to specific **only if player revisits or requests more help**. Ignored hints should fade, not intensify into nagging.

**Examples:**
- Three villages near each other: "These settlements seem to enjoy company. Room for one more?"
- Four villages, insufficient landmass: "Four villages together! I wonder what they'd become with more room to grow."
- Fortress near miss: "That village is in a rather defensible spot. I wonder what one more mountain would do."
- New Horizon: "Commander, look at everything you've created! I've found another region waiting for your imagination!"

**Trust:** BEEP never hints at an unimplemented recipe. Hints are optional and need not be explicitly accepted; accidental discovery counts fully. Provide an unobtrusive setting to reduce/mute hints while preserving important unlock notices.

## 6. Visual and audio direction

### 6.1 Art target

Use `art-direction-concept.png` as the **ambitious composition/finish reference** and `layout-sketch.png` as the **structural reference**. These are concept references, not game assets or a requirement to replicate each depicted building or label. Render rich, colorful, cohesive, polished illustrated relief-map terrain; the player should feel they're terraforming a miniature planet. The playable area should be predominantly top-down or modestly tilted to preserve recognizable land silhouettes. Mountains and settlements may be stylized/exaggerated for legibility.

- Ocean waves, coast foam, gentle cloud motion, subtly shifting illumination; environmental animation restrained enough to preserve clarity and battery life.
- Prosperity shown at **regional scale**: cultivated landscape patches, richer settlement-region iconography, road-network hints, celebratory glow/particles for transformations. Do not require individual villagers, ships, bridges, or buildings to be physically simulated.
- Discoveries have a satisfying **visual event first**, then BEEP reacts, then the trophy is recorded. Avoid long blocking cinematics.
- UI atmosphere extends beyond canvas: surrounding sea, sky, cloud banks, and theme-aware UI accents. Play area remains clearly bounded and tools remain readable.
- Distinct Region 02 environmental art, not merely a global hue filter.
- BEEP character style should be friendly, expressive, and consistent with the world. Minimize constant speech bubbles.

### 6.2 Audio

Optional gentle ambient ocean/atmosphere, soft terrain placement sounds, distinct transformation/discovery chimes, and light BEEP vocalizations. Default sensible volume, mute option, and respect browser audio autoplay restrictions. Audio failure must not block gameplay. Reduced motion option for effects where practical.

## 7. Save model and accessibility

- Browser-local autosave for each region, permanent achievements, unlocked tools/recipes, appearance overrides, settings, and optional player display name. Use a versioned save schema with migration or safe fallback.
- Export/import save JSON is desirable if cheap; **not a release blocker** if local saves are reliable. Never require a diagnostic export to play.
- Prevent data loss from ordinary page refresh or region switching. Confirm destructive reset.
- Keyboard and pointer accessibility where practical; adequate contrast and target sizes; avoid relying only on color to distinguish tile types. Reduced motion and mute options. Full EN/zh-TW UI, trophy text, BEEP dialogue, and region labels from the start.

## 8. Engineering delegation and constraints

Codex owns the implementation choice (Canvas2D, WebGL, DOM UI, sprites, procedural assets, prerendered illustrations, or hybrids). Prefer deterministic rules, data-driven achievement definitions, cached adjacency updates, and limited animation overhead. **Do not use real-time 3D or Spline merely because it is available.** Maintain desktop/mobile responsiveness, predictable save behavior, and visual non-regression against the accepted art proof.

Use simple seeded cosmetic variation so a stable map does not randomly reshuffle visual details on each edit/load. Track actual state separately from derived rendered appearance. Avoid unnecessary full-board expensive recomputation when local edits suffice, but correctness matters more than micro-optimization at 256 cells.

Do not expand into resource management, weather simulation, citizens, pathfinding, online multiplayer, AI-generated conversations, real-world coastline recognition, or planet-scale world generation in v1.

## 9. Delivery workflow — ONE human checkpoint

### Stage A — One art-direction acceptance (the only scheduled human test)

Codex builds a **single coherent screen visual proof** showing:
1. The 16×16 editable sea board within the immersive ocean/sky UI composition.
2. A mixed terrain sample with seamless coastline, continuous river bends, mountain ranges, and a coastal village.
3. The tile palette immediately below the board, BEEP, discovery UI, and a representative achievement effect.
4. Desktop view and representative narrow mobile view.
5. At least one clear visual comparison to the provided concept reference, stating any intentional deviations.

Deliver this to the owner **once for art-direction approval**. It can be a runnable proof or convincing assembled screenshot plus basic interactive prototype. The owner may accept or request a targeted correction. Do not require owner testing of mechanics, performance, or full game at this point. Once approved, the accepted visual language is the non-regression baseline.

### Stage B — Autonomous full build and QA

After art approval, Codex implements the complete bounded v1 and performs its own automated tests, browser interaction checks, screenshot comparisons, localization checks, save/load tests, and mobile viewport simulations. It should use available AI agent/skill tooling for independent review **when it demonstrably reduces owner involvement**, without introducing a large new process or dependency.

Minimum automated acceptance coverage:
- All 256 cells editable; undo/redo; accurate hit testing on desktop and touch.
- Connectivity rules including corners, edges, river mouths, settlement transformations, and reverse edits.
- Achievement registry: first-time only, persistence, retroactive transforms, near-miss logic, no impossible recipes.
- Any 10 distinct achievements unlock Region 02, and the new region has a visibly distinct theme and separate save.
- No BEEP false promises or intrusive repetitive hints.
- EN/zh-TW functional across the UI and major messages.
- Autosave/reload, region switch, undo/redo and reset do not corrupt state.
- Screenshot regression against approved art; no silent downgrade to generic flat tiles.
- Browser smoke tests for common desktop/mobile viewports and a touch interaction path.
- Basic accessibility, console error, and memory/performance smoke checks.

Use AI visual comparison, automated screenshots, deterministic test fixtures, and targeted test cases; **do not request repeated physical-device recordings or manual bug hunts from the owner**.

### Stage C — Bounded release and handoff

- Fix reproducible critical bugs, broken progression, data loss, unusable mobile interaction, serious performance failures, or major visual regressions. Log minor defects as known limitations.
- Deliver a complete playable build, deployment instructions or existing approved publishing route, test summary, known limitations, and a short user-facing play guide. Do not assume permission for an irreversible public deployment; obtain authorization if not already granted.
- **No second scheduled human acceptance gate.** If an actual critical blocker cannot be resolved autonomously, ask the owner one focused question. Otherwise finish and report.
- Do not start open-ended polish/optimization cycles. The product is done when the defined core experience and tests pass, with only noncritical limitations remaining.

**Commercial exception:** If the owner later chooses commercial distribution, introduce a separate quality plan for broader real-device compatibility, accessibility, security/privacy, save migration, user testing, legal/IP review, and release monitoring. This GDD's reduced human verification applies to the current personal/experimental release only.

## 10. Definition of done

The owner can open **Wonderlands** on desktop or phone, paint a geographically recognizable island on a responsive 16×16 board, see terrain and settlements merge naturally, receive unobtrusive BEEP reactions, discover achievements and new possibilities without being forced to pursue them, unlock a visibly different second region through any ten distinct trophies, and return to saved creations. The experience looks and feels like a cohesive illustrated ocean planet, not a generic grid editor. The implementation is verified autonomously after **one human art-direction review**.

## 11. Handoff instruction for Codex

**Implement Wonderlands using this GDD and the two supplied reference images. Name the app, repo-facing documentation, UI title, metadata, and deliverables Wonderlands from the outset. Begin with Stage A only.** Make the engineering and asset-pipeline choices yourself; ask the owner only about genuine creative ambiguities that materially affect the experience. Protect the visual target, content-aware tile behavior, geographic scale, and sandbox freedom. After the owner approves Stage A, execute Stage B and C autonomously with the stated bounded verification policy. Avoid adding further human review gates or optional feature campaigns.
