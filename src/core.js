export const SIZE = 16,
  TYPES = ["land", "hill", "mountain", "river", "village", "ocean"];
export const solid = (t) => ["land", "hill", "mountain"].includes(t);
export const neighbors = (i) =>
  [
    i >= 16 ? i - 16 : -1,
    i % 16 < 15 ? i + 1 : -1,
    i < 240 ? i + 16 : -1,
    i % 16 ? i - 1 : -1,
  ].filter((n) => n >= 0);
export const blank = () => ({ tiles: Array(256).fill("ocean"), variants: {} });
export const fresh = () => ({
  version: 1,
  active: 0,
  regions: [blank(), blank()],
  earned: [],
  used: [],
  replaced: false,
  revealed: false,
  settings: {
    lang: "en",
    name: "",
    hints: true,
    mute: true,
    reduced: false,
    grid: true,
  },
});
export function components(tiles, predicate) {
  const seen = new Set(),
    groups = [];
  for (let i = 0; i < 256; i++) {
    if (seen.has(i) || !predicate(tiles[i])) continue;
    const group = [],
      queue = [i];
    seen.add(i);
    while (queue.length) {
      const n = queue.pop();
      group.push(n);
      for (const j of neighbors(n))
        if (!seen.has(j) && predicate(tiles[j])) {
          seen.add(j);
          queue.push(j);
        }
    }
    groups.push(group);
  }
  return groups;
}
export function analyze(tiles) {
  const land = components(tiles, solid),
    rivers = components(tiles, (t) => t === "river"),
    mountains = components(tiles, (t) => t === "mountain"),
    villages = components(tiles, (t) => t === "village");
  const landAt = {};
  land.forEach((g) => g.forEach((i) => (landAt[i] = g.length)));
  const blocks = [];
  let island = false;
  for (let y = 0; y < 15; y++)
    for (let x = 0; x < 15; x++) {
      const i = y * 16 + x,
        b = [i, i + 1, i + 16, i + 17];
      if (b.every((n) => solid(tiles[n]))) island = true;
      if (b.every((n) => tiles[n] === "village")) blocks.push(b);
    }
  const cityBlocks = blocks.filter((b) =>
    b.some((i) => neighbors(i).some((n) => landAt[n] >= 25)),
  );
  const villagesFlat = villages.flat();
  return {
    land,
    rivers,
    mountains,
    villages,
    blocks,
    cityBlocks,
    island,
    landAt,
    villagesFlat,
    nonOcean: tiles.filter((t) => t !== "ocean").length,
    fortress: villagesFlat.filter(
      (i) => neighbors(i).filter((n) => tiles[n] === "mountain").length >= 3,
    ),
    port: villagesFlat.filter((i) =>
      neighbors(i).some((n) => tiles[n] === "ocean"),
    ),
    highland: villagesFlat.some((i) =>
      neighbors(i).some((n) => tiles[n] === "mountain"),
    ),
  };
}
const rule = (id, en, zh, desc, zdesc, test, hint) => ({
  id,
  title: { en, "zh-TW": zh },
  description: { en: desc, "zh-TW": zdesc },
  test,
  hint,
});
export const RECIPES = [
  rule(
    "A01",
    "One Small Patch for Mankind",
    "人類的一小塊土地",
    "Place your first plain, hill, or mountain.",
    "放置第一格平原、丘陵或山脈。",
    (a) => a.land.length > 0,
  ),
  rule(
    "A02",
    "Now That’s an Island!",
    "這才叫島嶼！",
    "Make a 2 × 2 block of plain, hill, or mountain.",
    "以平原、丘陵或山脈組成 2 × 2 區塊。",
    (a) => a.island,
  ),
  rule(
    "A03",
    "Civilization Can Thrive Here!",
    "文明在此繁盛！",
    "Place a village.",
    "放置一格村落。",
    (a) => a.villagesFlat.length > 0,
  ),
  rule(
    "A04",
    "Mother of Civilization",
    "文明之母",
    "Place a river.",
    "放置一格河流。",
    (a) => a.rivers.length > 0,
  ),
  rule(
    "A05",
    "Land Ho!",
    "陸地在望！",
    "Connect at least 10 solid-land cells.",
    "連接至少 10 格陸地。",
    (a) => a.land.some((g) => g.length >= 10),
  ),
  rule(
    "A06",
    "A River Runs Through It",
    "一條河流經此地",
    "Connect at least 5 river cells.",
    "連接至少 5 格河流。",
    (a) => a.rivers.some((g) => g.length >= 5),
  ),
  rule(
    "A07",
    "Reach for the Sky",
    "向天空伸展",
    "Connect 3 mountain cells.",
    "連接 3 格山脈。",
    (a) => a.mountains.some((g) => g.length >= 3),
  ),
  rule(
    "A08",
    "A Port of Call",
    "港灣初現",
    "Place a village beside ocean.",
    "在海洋旁放置村落。",
    (a) => a.port.length > 0,
  ),
  rule(
    "A09",
    "Highland Hospitality",
    "高地的款待",
    "Place a village beside a mountain.",
    "在山脈旁放置村落。",
    (a) => a.highland,
  ),
  rule(
    "A10",
    "Mountain Stronghold",
    "山中堡壘",
    "Surround a village with mountains on 3 cardinal sides.",
    "以山脈圍住村落的三個正交方向。",
    (a) => a.fortress.length > 0,
    {
      near: (a, t) =>
        a.villagesFlat.some(
          (i) => neighbors(i).filter((n) => t[n] === "mountain").length === 2,
        ),
      en: "That village looks rather defensible. I wonder what one more mountain would do.",
      "zh-TW": "那座村落看起來很適合防守。不知道再多一座山會怎麼樣？",
    },
  ),
  rule(
    "A11",
    "We Are Not Alone",
    "我們並不孤單",
    "Place 3 villages anywhere.",
    "在任意位置放置 3 格村落。",
    (a) => a.villagesFlat.length >= 3,
  ),
  rule(
    "A12",
    "Neighbors!",
    "好鄰居！",
    "Connect 2 villages orthogonally.",
    "以正交方向連接 2 格村落。",
    (a) => a.villages.some((g) => g.length >= 2),
  ),
  rule(
    "A13",
    "Growing Together",
    "一起成長",
    "Arrange villages in a 2 × 2 block.",
    "將村落排列為 2 × 2 區塊。",
    (a) => a.blocks.length > 0,
  ),
  rule(
    "A14",
    "A City Is Born",
    "城市誕生了",
    "A 2 × 2 village block must border a connected mass of at least 25 plain, hill, or mountain cells.",
    "讓 2 × 2 村落區塊緊鄰至少 25 格相連的平原、丘陵或山脈。",
    (a) => a.cityBlocks.length > 0,
    {
      near: (a) => a.blocks.length > 0 && !a.cityBlocks.length,
      en: "Four villages together! I wonder what they’d become with more room to grow.",
      "zh-TW": "四座村落聚在一起！不知道有更多成長空間後會變成什麼樣子。",
    },
  ),
  rule(
    "A15",
    "Archipelago Architect",
    "群島建築師",
    "Create 3 separate solid-land masses with at least 4 cells each.",
    "創造 3 塊各至少 4 格、互不相連的陸地。",
    (a) => a.land.filter((g) => g.length >= 4).length >= 3,
  ),
  rule(
    "A16",
    "The Great Divide",
    "壯闊山脈",
    "Connect 5 mountain cells.",
    "連接 5 格山脈。",
    (a) => a.mountains.some((g) => g.length >= 5),
  ),
  rule(
    "A17",
    "From Mountains to Sea",
    "從山脈到海洋",
    "One connected river network must border both a mountain and ocean.",
    "同一條相連河流必須同時接觸山脈與海洋。",
    (a, t) =>
      a.rivers.some(
        (g) =>
          g.some((i) => neighbors(i).some((n) => t[n] === "mountain")) &&
          g.some((i) => neighbors(i).some((n) => t[n] === "ocean")),
      ),
  ),
  rule(
    "A18",
    "A Little Bit of Everything",
    "每樣來一點",
    "Use all five non-ocean tools at least once.",
    "至少使用過五種非海洋工具各一次。",
    (a, t, s) => TYPES.slice(0, 5).every((k) => s.used.includes(k)),
  ),
  rule(
    "A19",
    "A Whole New World",
    "嶄新的世界",
    "Have 50 non-ocean cells in the current region.",
    "在目前區域放置 50 格非海洋地形。",
    (a) => a.nonOcean >= 50,
  ),
  rule(
    "A20",
    "Second Thoughts",
    "改變心意",
    "Replace an occupied cell with a different terrain.",
    "將已放置的地形換成另一種。",
    (a, t, s) => s.replaced,
  ),
];
export function discover(state) {
  const t = state.regions[state.active].tiles,
    a = analyze(t),
    added = [];
  for (const r of RECIPES)
    if (!state.earned.includes(r.id) && r.test(a, t, state)) {
      state.earned.push(r.id);
      added.push(r.id);
    }
  return added;
}
export const secondUnlocked = (s) => s.earned.length >= 10;
export function choices(state, i) {
  const t = state.regions[state.active].tiles;
  if (t[i] !== "village")
    return ["hill", "mountain"].includes(t[i]) ||
      (t[i] === "river" && state.earned.includes("A06"))
      ? ["auto", "a", "b"]
      : ["auto"];
  const a = analyze(t),
    c = ["ordinary"];
  if (a.port.includes(i)) c.push("port");
  if (neighbors(i).some((n) => t[n] === "river")) c.push("riverside");
  if (a.fortress.includes(i)) c.push("fortress");
  if (state.earned.includes("A14") && a.cityBlocks.some((b) => b.includes(i)))
    c.push("city");
  return ["auto", ...c];
}
export function appearance(state, i) {
  const t = state.regions[state.active].tiles;
  if (t[i] !== "village") return t[i];
  const valid = choices(state, i),
    override = state.regions[state.active].variants[i];
  return valid.includes(override) && override !== "auto"
    ? override
    : valid.at(-1);
}
export function paint(state, i, type) {
  if (!Number.isInteger(i) || i < 0 || i > 255 || !TYPES.includes(type))
    return false;
  const r = state.regions[state.active],
    old = r.tiles[i];
  if (old === type) return false;
  if (old !== "ocean") state.replaced = true;
  r.tiles[i] = type;
  delete r.variants[i];
  if (type !== "ocean" && !state.used.includes(type)) state.used.push(type);
  return true;
}
export function nearMiss(state) {
  const t = state.regions[state.active].tiles,
    a = analyze(t);
  return (
    RECIPES.find((r) => !state.earned.includes(r.id) && r.hint?.near(a, t))
      ?.hint || null
  );
}
export function decode(raw) {
  let s = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (s?.version === 0 && Array.isArray(s.tiles)) {
    s = { ...fresh(), regions: [{ tiles: s.tiles, variants: {} }, blank()] };
  }
  if (s?.version !== 1 || !Array.isArray(s.regions) || s.regions.length !== 2)
    throw Error("Unsupported save");
  const out = fresh();
  for (let i = 0; i < 2; i++) {
    const r = s.regions[i];
    if (
      !Array.isArray(r.tiles) ||
      r.tiles.length !== 256 ||
      r.tiles.some((t) => !TYPES.includes(t))
    )
      throw Error("Invalid terrain");
    out.regions[i].tiles = [...r.tiles];
    for (const [k, v] of Object.entries(r.variants || {}))
      if (
        /^\d+$/.test(k) &&
        +k < 256 &&
        [
          "a",
          "b",
          "ordinary",
          "port",
          "riverside",
          "fortress",
          "city",
        ].includes(v)
      )
        out.regions[i].variants[k] = v;
  }
  out.earned = [
    ...new Set(
      (Array.isArray(s.earned) ? s.earned : []).filter((id) =>
        RECIPES.some((r) => r.id === id),
      ),
    ),
  ];
  out.used = [
    ...new Set(
      (Array.isArray(s.used) ? s.used : []).filter((t) =>
        TYPES.slice(0, 5).includes(t),
      ),
    ),
  ];
  out.replaced = s.replaced === true;
  out.revealed = s.revealed === true;
  out.active = s.active === 1 && secondUnlocked(out) ? 1 : 0;
  const cfg = s.settings || {};
  out.settings.lang = cfg.lang === "zh-TW" ? "zh-TW" : "en";
  out.settings.name = typeof cfg.name === "string" ? cfg.name.slice(0, 32) : "";
  for (const k of ["hints", "mute", "reduced", "grid"])
    if (typeof cfg[k] === "boolean") out.settings[k] = cfg[k];
  for (const r of out.regions)
    for (const t of r.tiles)
      if (t !== "ocean" && !out.used.includes(t)) out.used.push(t);
  const active = out.active;
  for (let i = 0; i < 2; i++) {
    out.active = i;
    discover(out);
  }
  out.active = active;
  return out;
}
// Orthogonal supercover: even diagonal drags produce cardinally joined terrain.
export function strokeCells(a, b) {
  let x = a % 16,
    y = Math.floor(a / 16),
    x2 = b % 16,
    y2 = Math.floor(b / 16),
    dx = Math.abs(x2 - x),
    dy = -Math.abs(y2 - y),
    sx = x < x2 ? 1 : -1,
    sy = y < y2 ? 1 : -1,
    err = dx + dy;
  const out = [a];
  while (x !== x2 || y !== y2) {
    const e = 2 * err;
    if (e >= dy && x !== x2) {
      err += dy;
      x += sx;
      out.push(y * 16 + x);
    }
    if (e <= dx && y !== y2) {
      err += dx;
      y += sy;
      out.push(y * 16 + x);
    }
  }
  return out;
}
