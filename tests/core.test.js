import test from "node:test";
import assert from "node:assert/strict";
import {
  fresh,
  paint,
  discover,
  analyze,
  appearance,
  choices,
  neighbors,
  components,
  decode,
  secondUnlocked,
  RECIPES,
  nearMiss,
  strokeCells,
} from "../src/core.js";
import { contours } from "../src/renderer.js";
const at = (x, y) => y * 16 + x;
const set = (s, x, y, t) => paint(s, at(x, y), t);
const rectangle = (s, x, y, w, h, t = "land") => {
  for (let r = y; r < y + h; r++)
    for (let c = x; c < x + w; c++) set(s, c, r, t);
};
function rich() {
  const s = fresh();
  rectangle(s, 2, 2, 11, 11);
  for (let y = 2; y < 9; y++) set(s, 8, y, "river");
  for (let x = 3; x < 8; x++) set(s, x, 4, "mountain");
  set(s, 5, 3, "hill");
  rectangle(s, 4, 7, 2, 2, "village");
  set(s, 12, 10, "village");
  set(s, 5, 5, "village");
  set(s, 4, 5, "mountain");
  set(s, 6, 5, "mountain");
  return s;
}
test("all 256 cells edit and erase, invalid edits are rejected", () => {
  const s = fresh();
  for (let i = 0; i < 256; i++) assert.equal(paint(s, i, "land"), true);
  assert.equal(analyze(s.regions[0].tiles).land[0].length, 256);
  for (let i = 0; i < 256; i++) paint(s, i, "ocean");
  assert.equal(analyze(s.regions[0].tiles).nonOcean, 0);
  assert.equal(paint(s, -1, "land"), false);
  assert.equal(paint(s, 256, "land"), false);
  assert.equal(paint(s, 1, "lava"), false);
  assert.equal(paint(s, 1.5, "land"), false);
});
test("orthogonal adjacency has correct corners, edges and no row wrapping", () => {
  assert.deepEqual(neighbors(0), [1, 16]);
  assert.deepEqual(neighbors(15), [31, 14]);
  assert.deepEqual(neighbors(255), [239, 254]);
  assert(!neighbors(15).includes(16));
  const s = fresh();
  set(s, 0, 0, "land");
  set(s, 1, 1, "land");
  assert.equal(components(s.regions[0].tiles, (t) => t === "land").length, 2);
  set(s, 1, 0, "land");
  assert.equal(analyze(s.regions[0].tiles).land.length, 1);
});
test("rivers and villages do not count as solid land for island achievement", () => {
  const s = fresh();
  rectangle(s, 0, 0, 2, 2);
  set(s, 1, 1, "river");
  assert(!analyze(s.regions[0].tiles).island);
  set(s, 1, 1, "village");
  assert(!analyze(s.regions[0].tiles).island);
  set(s, 1, 1, "hill");
  assert(analyze(s.regions[0].tiles).island);
});
test("river networks connect bends and junctions then split on reverse edits", () => {
  const s = fresh();
  for (const [x, y] of [
    [5, 5],
    [5, 6],
    [6, 6],
    [7, 6],
    [6, 7],
  ])
    set(s, x, y, "river");
  set(s, 5, 4, "mountain");
  discover(s);
  assert(s.earned.includes("A06"));
  assert(s.earned.includes("A17"));
  set(s, 6, 6, "ocean");
  assert.equal(analyze(s.regions[0].tiles).rivers.length, 3);
  assert(s.earned.includes("A06"));
});
test("settlement contexts reverse after mountain and ocean changes", () => {
  const s = fresh();
  set(s, 5, 5, "village");
  assert.equal(appearance(s, 85), "port");
  for (const [x, y] of [
    [5, 4],
    [6, 5],
    [5, 6],
  ])
    set(s, x, y, "mountain");
  assert.equal(appearance(s, 85), "fortress");
  discover(s);
  set(s, 5, 4, "land");
  assert.equal(appearance(s, 85), "port");
  set(s, 4, 5, "land");
  assert.equal(appearance(s, 85), "ordinary");
  assert(s.earned.includes("A10"));
});
test("compatible overrides win and invalid overrides fall back to Auto semantics", () => {
  const s = fresh();
  set(s, 5, 5, "village");
  s.regions[0].variants[85] = "ordinary";
  assert.equal(appearance(s, 85), "ordinary");
  s.regions[0].variants[85] = "fortress";
  assert.equal(appearance(s, 85), "port");
  assert(!choices(s, 85).includes("fortress"));
});
test("city capability unlocks retroactively and reverse edits dismantle the derived city", () => {
  const s = fresh();
  rectangle(s, 1, 1, 5, 5);
  set(s, 1, 1, "ocean");
  rectangle(s, 6, 3, 2, 2, "village");
  discover(s);
  assert(!s.earned.includes("A14"));
  assert.notEqual(appearance(s, 54), "city");
  assert(nearMiss(s));
  set(s, 1, 1, "land");
  discover(s);
  assert(s.earned.includes("A14"));
  assert.equal(appearance(s, 54), "city");
  set(s, 7, 4, "ocean");
  assert.notEqual(appearance(s, 54), "city");
  assert(s.earned.includes("A14"));
});
test("all 20 recipes are reachable; registry IDs and translations are complete", () => {
  const s = rich();
  discover(s);
  const arch = fresh();
  rectangle(arch, 0, 0, 2, 2);
  rectangle(arch, 5, 5, 2, 2);
  rectangle(arch, 12, 12, 2, 2);
  discover(arch);
  const earned = new Set([...s.earned, ...arch.earned]);
  for (const r of RECIPES) {
    assert(earned.has(r.id), `${r.id} is unreachable in fixtures`);
    assert(
      r.title.en &&
        r.title["zh-TW"] &&
        r.description.en &&
        r.description["zh-TW"],
    );
  }
  assert.equal(new Set(RECIPES.map((r) => r.id)).size, 20);
});
test("discoveries are first-time only and stay after dismantling", () => {
  const s = rich();
  assert(discover(s).length > 0);
  assert.deepEqual(discover(s), []);
  const earned = [...s.earned];
  s.regions[0].tiles.fill("ocean");
  discover(s);
  assert.deepEqual(s.earned, earned);
});
test("any ten distinct valid discoveries unlock second region", () => {
  const s = fresh();
  s.earned = RECIPES.slice(10, 19).map((r) => r.id);
  assert(!secondUnlocked(s));
  s.earned.push("A01");
  assert(secondUnlocked(s));
  const loaded = decode(JSON.stringify({ ...s, active: 1 }));
  assert.equal(loaded.active, 1);
  loaded.regions[1].tiles[255] = "hill";
  assert.equal(loaded.regions[0].tiles[255], "ocean");
});
test("save round trip preserves both regions, settings, overrides, permanent rewards", () => {
  const s = rich();
  discover(s);
  s.active = 1;
  set(s, 1, 1, "hill");
  s.regions[1].variants[17] = "b";
  s.settings = {
    lang: "zh-TW",
    name: "星光",
    hints: false,
    mute: false,
    reduced: true,
    grid: false,
  };
  const load = decode(JSON.stringify(s));
  assert.deepEqual(load, s);
});
test("corrupt, unsupported and partial saves reject safely; old schema migrates", () => {
  assert.throws(() => decode("{bad"));
  assert.throws(() => decode({ version: 2 }));
  const s = fresh();
  s.regions[0].tiles = ["land"];
  assert.throws(() => decode(s));
  const old = decode({ version: 0, tiles: Array(256).fill("ocean") });
  assert.equal(old.version, 1);
  assert.equal(old.regions[0].tiles.length, 256);
});
test("save-load re-evaluates existing arrangements for retroactive rewards", () => {
  const s = rich();
  s.earned = [];
  const load = decode(s);
  assert(load.earned.includes("A14"));
  assert.equal(appearance(load, 116), "city");
});
test("near-miss hints stop after discovery and never refer to unimplemented recipes", () => {
  const s = fresh();
  set(s, 5, 5, "village");
  set(s, 5, 4, "mountain");
  set(s, 6, 5, "mountain");
  assert(nearMiss(s));
  set(s, 5, 6, "mountain");
  discover(s);
  assert.equal(nearMiss(s), null);
  for (const r of RECIPES.filter((r) => r.hint))
    assert.equal(typeof r.test, "function");
});
test("coast contours cover isolated, diagonal, solid and holed layouts deterministically", () => {
  const s = fresh();
  set(s, 0, 0, "land");
  set(s, 1, 1, "land");
  assert.equal(contours(s.regions[0].tiles).length, 2);
  s.regions[0].tiles.fill("land");
  assert.equal(contours(s.regions[0].tiles).length, 1);
  set(s, 5, 5, "ocean");
  assert.equal(contours(s.regions[0].tiles).length, 2);
  const before = contours(s.regions[0].tiles);
  set(s, 8, 8, "ocean");
  set(s, 8, 8, "land");
  assert.deepEqual(contours(s.regions[0].tiles), before);
});
test("seeded arbitrary layouts retain complete connectivity coverage and reversible contours", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = fresh();
    for (let i = 0; i < 256; i++)
      if ((i * 31 + seed * 17) % 7 < 3)
        paint(s, i, ["land", "mountain", "river"][i % 3]);
    const a = analyze(s.regions[0].tiles);
    assert.equal(
      a.land.flat().length,
      s.regions[0].tiles.filter((t) => ["land", "hill", "mountain"].includes(t))
        .length,
    );
    const loops = contours(s.regions[0].tiles);
    assert(loops.length > 0);
    assert.deepEqual(contours(s.regions[0].tiles), loops);
  }
});

test("diagonal paint drags create connected cardinal paths in every direction", () => {
  for (const [a, b] of [
    [0, 255],
    [255, 0],
    [15, 240],
    [240, 15],
    [3, 87],
    [87, 3],
  ]) {
    const cells = strokeCells(a, b);
    assert.equal(cells[0], a);
    assert.equal(cells.at(-1), b);
    for (let i = 1; i < cells.length; i++)
      assert(neighbors(cells[i]).includes(cells[i - 1]));
    const s = fresh();
    cells.forEach((i) => paint(s, i, "river"));
    assert.equal(analyze(s.regions[0].tiles).rivers.length, 1);
  }
});
