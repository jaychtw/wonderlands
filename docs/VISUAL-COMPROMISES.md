# Wonderlands — production visuals versus Stage A

The Stage A direction was approved conditionally on genuine dynamic editing. Its fixed island illustration was an aesthetic reference, not evidence of a terrain renderer. The playable game does not load that image or the supplied concept. The release package explicitly excludes them.

## What is generated from player state

The current cell array determines the coastline's union contours, holes, islands and bays. Rounded, slightly irregular outlines carry shallow-water bands, sand and foam. Ground materials are clipped to that geometry; they contain no coastline, river, settlement or prepared map. Rivers use one combined connected path so bends and shared-edge joins have no per-tile end-cap seams. Orthogonal drag interpolation fills intermediate cells when the pointer moves diagonally. Hills/mountains compose over connective relief; settlement context is derived again after every edit, undo, load or capability unlock.

Six independent transparent illustrations (hill, mountain, grove, village, port and fortress) are composited into arbitrary locations. A city joins a qualifying settlement block with a shared footprint, roads, peripheral houses and central architectural relief. Appearance overrides choose only currently compatible contexts and fall back when the context disappears. Cosmetic variation is seeded by cell index, so stable cells do not randomly reshuffle.

The outer ocean/sky artwork is decorative environment only. It never determines editable geography. Region 02 uses its own amber ground material and procedural umbrella-tree vegetation, in addition to different water and atmosphere; it is not just a full-screen hue filter.

## Significant production compromises

| Stage A aspiration | Dynamic production result |
| --- | --- |
| Bespoke painted shoreline detail at every cove | Continuous generated geometry with softened cell-scale steps, a limited family of sand/foam bands and seeded irregularity. Large outlines still reveal the 16 × 16 grid. |
| Individually composed mountain silhouettes and forest canopy | Reusable illustrated relief sprites with connective ridges and seeded overlapping groves. Repetition is visible, especially in dense full-board layouts. |
| Rich variable-width river painting | Smooth, connected fixed-width river paths, with cosmetic earned variants. No hydrology, height-driven flow, physical delta generation or individually painted waterfalls. |
| A fully bespoke regional city illustration | Context-derived common sprites assembled into one settlement footprint. City/fortress detail is intentionally condensed at regional scale. |
| Dense hand-painted detail throughout | Illustrated material textures and small decorative patches give arbitrary layouts detail, but are less nuanced than the fixed Stage A scene. There are no physically simulated citizens or ships. |
| Distinct second-region art throughout | Amber terrain and acacia-like vegetation are distinct; settlement architecture and relief sprites are reused, and the outer ocean illustration is shared with warm lighting. |
| Rich ambient animation | Restrained BEEP motion, subtle illumination and discovery effects. Ocean wave marks are static; no expensive animated water simulation. |

This build retains the illustrated materials, detailed relief assets, ocean continuity, warm brass/ivory interface and companion character. **It does not match the fixed concept's bespoke finish pixel for pixel**, and the terrain is visibly simpler. These compromises are documented rather than presented as visual parity. The approved screenshots remain in `proof/`; actual gameplay captures are in `evidence/`.

## Visual verification

The browser suite paints the sample from an empty sea using real pointer events, captures both states, cuts and restores geography, and verifies restored pixels and save state. It also paints a heart and separate islands, captures settlement reversions, checks a second region, and captures mobile/zh-TW gameplay. This tests composition beyond the Stage A arrangement. Deterministic full-board captures are hash-checked across reloads. Side-by-side comparison with Stage A is qualitative: different layouts cannot produce meaningful pixel-identical concept comparisons. No external human review is needed for these checks.

Only modern Chromium desktop and emulated mobile touch were executed here. Physical-device GPU quality, Safari/Firefox behavior and sustained low-end battery performance remain unverified. Accessibility includes semantic controls, labels, keyboard editing and reduced motion, but is not a comprehensive screen-reader certification.
