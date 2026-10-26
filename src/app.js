import {
  fresh,
  decode,
  paint,
  discover,
  analyze,
  choices,
  appearance,
  nearMiss,
  secondUnlocked,
  RECIPES,
  TYPES,
  strokeCells,
} from "./core.js";
import { Renderer } from "./renderer.js";
const $ = (s) => document.querySelector(s),
  KEY = "wonderlands.save.v1";
let state = fresh(),
  storageError = false,
  recovery = false,
  recoveryPreserved = false;
try {
  const raw = localStorage.getItem(KEY);
  if (raw)
    try {
      state = decode(raw);
    } catch {
      recovery = true;
      try {
        localStorage.setItem(KEY + ".recovery", raw);
        recoveryPreserved = true;
      } catch {
        storageError = true;
      }
    }
} catch {
  storageError = true;
}
const canvas = $("#world"),
  board = $("#board"),
  renderer = new Renderer(canvas);
let tool = "land",
  inspect = false,
  selected = 0,
  zoom = 1,
  drag = null,
  undo = [],
  redo = [],
  revision = 0,
  lastBeep = 0,
  beepKey = "opening",
  lastDiscovery = null,
  saveTimer,
  dirty = false,
  renderPending = false;
const L = (en, zh) => (state.settings.lang === "zh-TW" ? zh : en);
const names = {
  land: ["Land", "平原"],
  hill: ["Hill", "丘陵"],
  mountain: ["Mountain", "山脈"],
  river: ["River", "河流"],
  village: ["Village", "村落"],
  ocean: ["Ocean / Erase", "海洋／擦除"],
  auto: ["Auto", "自動"],
  a: ["Variant A", "樣式 A"],
  b: ["Variant B", "樣式 B"],
  ordinary: ["Village", "一般村落"],
  port: ["Port", "港口"],
  riverside: ["River settlement", "河畔聚落"],
  fortress: ["Fortress", "堡壘"],
  city: ["City", "城市"],
};
const name = (k) => L(...(names[k] || [k, k]));
const region = () => state.regions[state.active];
const snapshot = () => structuredClone(region());
const staticText = [...document.querySelectorAll("[data-zh]")];
staticText.forEach((e) => (e.dataset.en = e.textContent));
function status(en, zh) {
  $("#status").textContent = L(en, zh);
}
function persist() {
  clearTimeout(saveTimer);
  if (storageError) {
    status(
      "Saving unavailable — export a backup in Settings.",
      "無法儲存，請至設定匯出備份。",
    );
    return;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    dirty = false;
    status("Saved on this browser", "已儲存於此瀏覽器");
  } catch {
    storageError = true;
    status(
      "Saving unavailable — export a backup in Settings.",
      "無法儲存，請至設定匯出備份。",
    );
  }
}
function scheduleSave() {
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 100);
}
function redraw() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    renderer.selected = inspect ? selected : null;
    renderer.draw(state);
  });
}
function beep() {
  const line = $(".beep-line");
  if (beepKey === "opening")
    line.textContent = L(
      "Commander, an entire ocean planet! I wonder what we could make of it…",
      "指揮官，一整顆海洋星球！不知道我們能創造什麼……",
    );
  else if (beepKey === "horizon")
    line.textContent = L(
      `${state.settings.name || "Commander"}, look at everything you’ve created! I’ve found another region waiting for your imagination!`,
      `${state.settings.name || "指揮官"}，看看你創造的一切！我發現另一個等待你發揮想像力的區域！`,
    );
  else if (beepKey === "hint") {
    const h = nearMiss(state);
    line.textContent = h
      ? h[state.settings.lang]
      : L(
          "No hurry. Even the smallest island has a story.",
          "不用著急，最小的島嶼也有自己的故事。",
        );
  } else {
    const r = RECIPES.find((r) => r.id === beepKey);
    line.textContent = r
      ? L(
          `“${r.title.en}” — oh! I wonder what we’ll discover next.`,
          `「${r.title["zh-TW"]}」——哇！不知道接下來會發現什麼。`,
        )
      : L("This little world is yours.", "這個小世界屬於你。");
  }
}
function labels() {
  staticText.forEach(
    (e) =>
      (e.textContent =
        e.dataset[state.settings.lang === "zh-TW" ? "zh" : "en"]),
  );
  document.documentElement.lang = state.settings.lang;
  document.body.classList.toggle("ochre", state.active === 1);
  document.body.classList.toggle("reduced", state.settings.reduced);
  $(".edition").textContent = L(
    "BEEP WONDERS. YOU CREATE.",
    "BEEP 好奇，你來創造。",
  );
  $(".world-heading .eyebrow").textContent = L(
    `REGION 0${state.active + 1} · OCEAN PLANET`,
    `第 ${state.active + 1} 區域 · 海洋星球`,
  );
  $(".map-note>span").textContent = "0" + (state.active + 1);
  $("#regions").replaceChildren();
  for (let i = 0; i < (secondUnlocked(state) ? 2 : 1); i++) {
    const o = document.createElement("option");
    o.value = i;
    o.textContent =
      i === 0
        ? L("The Verdant Coast", "翠綠海岸")
        : L("The Amber Expanse", "琥珀原野");
    o.selected = i === state.active;
    $("#regions").append(o);
  }
  for (const [id, en, zh] of [
    ["journal", "Discovery journal", "探索日誌"],
    ["settings", "Settings", "設定"],
    ["language", "Change language", "切換語言"],
    ["regions", "Region", "區域"],
    ["zoom-in", "Zoom in", "放大"],
    ["zoom-out", "Zoom out", "縮小"],
  ])
    $("#" + id).setAttribute("aria-label", L(en, zh));
  $(".close").setAttribute("aria-label", L("Close", "關閉"));
  $(".beep-figure svg").setAttribute(
    "aria-label",
    L(
      "BEEP, your curious floating robot companion",
      "BEEP，你的好奇浮游機器人夥伴",
    ),
  );
  $(".palette").setAttribute("aria-label", L("Terrain tools", "地形工具"));
  $("nav").setAttribute("aria-label", L("World controls", "世界控制"));
  $(".canvas-section").setAttribute(
    "aria-label",
    L("Editable world", "可編輯世界"),
  );
  $("#keyboard-help").textContent = L(
    "Arrow keys select a cell. Space or Enter paints. Keys 1–6 select terrain. I toggles inspect. Control Z undoes; Control Shift Z redoes. Scroll to pan when zoomed.",
    "方向鍵選取格子，空白鍵或 Enter 放置地形。1 至 6 選擇工具，I 切換檢視，Control Z 復原，Control Shift Z 重做。放大後可捲動平移。",
  );
  update();
  beep();
}
function update() {
  const a = analyze(region().tiles);
  $("#count").textContent = L(
    `${a.nonOcean} / 256 terraformed`,
    `${a.nonOcean} / 256 格已改造`,
  );
  $("#undo").disabled = !undo.length;
  $("#redo").disabled = !redo.length;
  $("#inspect").setAttribute("aria-pressed", String(inspect));
  $("#zoom-label").textContent = Math.round(zoom * 100) + "%";
  canvas.setAttribute(
    "aria-label",
    L(
      `Editable 16 by 16 world. Row ${Math.floor(selected / 16) + 1}, column ${(selected % 16) + 1}: ${name(region().tiles[selected])}.`,
      `可編輯的 16 × 16 世界。第 ${Math.floor(selected / 16) + 1} 列，第 ${(selected % 16) + 1} 欄：${name(region().tiles[selected])}。`,
    ),
  );
  for (const b of document.querySelectorAll("[data-tool]")) {
    b.classList.toggle("selected", b.dataset.tool === tool);
    b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
    b.setAttribute("aria-label", name(b.dataset.tool));
  }
  const r =
    RECIPES.find((r) => r.id === lastDiscovery) ||
    RECIPES.find((r) => r.id === state.earned.at(-1));
  $("#discovery-title").textContent = r
    ? r.title[state.settings.lang]
    : L("A sea of possibilities", "無限可能的海洋");
  $("#discovery-description").textContent = r
    ? r.description[state.settings.lang]
    : L(
        "Your next discovery is waiting somewhere in your imagination.",
        "下一個驚喜，正等待你的想像力。",
      );
  $("#discovery-count").textContent = L(
    `${state.earned.length} discoveries recorded`,
    `${state.earned.length} 項發現已記錄`,
  );
  $("#discovery .eyebrow").textContent = r
    ? L("DISCOVERY JOURNAL", "探索日誌")
    : L("ROOM FOR WONDER", "留點空間給驚喜");
  const t = region().tiles[selected];
  $("#detail").hidden = !inspect || t === "ocean";
  if (inspect && t !== "ocean") {
    const sel = $("#variant");
    sel.hidden = choices(state, selected).length < 2;
    sel.previousElementSibling.hidden = sel.hidden;
    sel.replaceChildren();
    for (const v of choices(state, selected)) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = name(v);
      sel.append(o);
    }
    sel.value = choices(state, selected).includes(region().variants[selected])
      ? region().variants[selected]
      : "auto";
    $("#cell-info").textContent = L(
      `Cell ${selected + 1} · ${name(appearance(state, selected))}`,
      `第 ${selected + 1} 格 · ${name(appearance(state, selected))}`,
    );
  }
}
function chime() {
  if (state.settings.mute) return;
  try {
    const ctx =
      audio ||
      (audio = new (window.AudioContext || window.webkitAudioContext)());
    ctx.resume().catch(() => {});
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}
let audio;
function reaction(ids, wasUnlocked) {
  if (!ids.length) return;
  lastDiscovery = ids.includes("A14")
    ? "A14"
    : ids.includes("A10")
      ? "A10"
      : ids.at(-1);
  $("#sparkles").classList.remove("play");
  void $("#sparkles").offsetWidth;
  $("#sparkles").classList.add("play");
  $("#discovery").classList.remove("flash");
  void $("#discovery").offsetWidth;
  $("#discovery").classList.add("flash");
  chime();
  if (!wasUnlocked && secondUnlocked(state)) {
    beepKey = "horizon";
    state.revealed = true;
    labels();
  } else if (Date.now() - lastBeep > 6500) {
    beepKey = lastDiscovery;
    lastBeep = Date.now();
    const rev = revision;
    setTimeout(() => {
      if (rev === revision) beep();
    }, 300);
  }
  update();
}
function changed(before, wasUnlocked) {
  if (JSON.stringify(before) === JSON.stringify(region())) return;
  undo.push(before);
  if (undo.length > 60) undo.shift();
  redo = [];
  revision++;
  const ids = discover(state);
  reaction(ids, wasUnlocked);
  update();
  redraw();
  scheduleSave();
}
function hit(e) {
  const r = canvas.getBoundingClientRect();
  if (
    e.clientX < r.left ||
    e.clientX >= r.right ||
    e.clientY < r.top ||
    e.clientY >= r.bottom
  )
    return null;
  return (
    Math.floor(((e.clientY - r.top) / r.height) * 16) * 16 +
    Math.floor(((e.clientX - r.left) / r.width) * 16)
  );
}
function cursor(i) {
  $("#cursor").style.display = i === null ? "none" : "block";
  if (i !== null) {
    $("#cursor").style.left = (i % 16) * 6.25 + "%";
    $("#cursor").style.top = Math.floor(i / 16) * 6.25 + "%";
  }
}
function endStroke() {
  if (!drag) return;
  const d = drag;
  drag = null;
  changed(d.before, d.wasUnlocked);
}
canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || !e.isPrimary) return;
  e.preventDefault();
  canvas.focus({ preventScroll: true });
  const i = hit(e);
  if (i === null) return;
  selected = i;
  if (inspect) {
    update();
    redraw();
    return;
  }
  drag = {
    before: snapshot(),
    wasUnlocked: secondUnlocked(state),
    last: i,
    pointerId: e.pointerId,
  };
  canvas.setPointerCapture(e.pointerId);
  paint(state, i, tool);
  cursor(i);
  redraw();
});
canvas.addEventListener("pointermove", (e) => {
  const i = hit(e);
  cursor(i);
  if (!drag || drag.pointerId !== e.pointerId || i === null) return;
  for (const cell of strokeCells(drag.last, i)) paint(state, cell, tool);
  drag.last = i;
  selected = i;
  redraw();
});
canvas.addEventListener("pointerup", endStroke);
canvas.addEventListener("pointercancel", endStroke);
canvas.addEventListener("lostpointercapture", endStroke);
canvas.addEventListener("pointerleave", () => {
  if (!drag) cursor(null);
});
for (const b of document.querySelectorAll("[data-tool]"))
  b.onclick = () => {
    endStroke();
    tool = b.dataset.tool;
    inspect = false;
    update();
    redraw();
    status(`${name(tool)} selected`, `${name(tool)}已選取`);
  };
$("#undo").onclick = () => {
  endStroke();
  if (!undo.length) return;
  redo.push(snapshot());
  state.regions[state.active] = undo.pop();
  revision++;
  update();
  redraw();
  persist();
};
$("#redo").onclick = () => {
  if (!redo.length) return;
  undo.push(snapshot());
  state.regions[state.active] = redo.pop();
  revision++;
  discover(state);
  update();
  redraw();
  persist();
};
$("#save").onclick = () => {
  endStroke();
  persist();
};
$("#inspect").onclick = () => {
  endStroke();
  inspect = !inspect;
  update();
  redraw();
};
$("#variant").onchange = (e) => {
  const before = snapshot();
  if (e.target.value === "auto") delete region().variants[selected];
  else region().variants[selected] = e.target.value;
  changed(before, secondUnlocked(state));
};
function setZoom(v) {
  zoom = Math.max(1, Math.min(3, v));
  board.style.width = zoom * 100 + "%";
  update();
}
$("#zoom-in").onclick = () => setZoom(zoom + 0.5);
$("#zoom-out").onclick = () => setZoom(zoom - 0.5);
canvas.addEventListener("keydown", (e) => {
  const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -16, ArrowDown: 16 };
  if (e.key in moves) {
    e.preventDefault();
    const i = selected + moves[e.key];
    if (
      i >= 0 &&
      i < 256 &&
      (!(e.key === "ArrowLeft" || e.key === "ArrowRight") ||
        Math.floor(i / 16) === Math.floor(selected / 16))
    )
      selected = i;
    cursor(selected);
    update();
    const r = canvas.getBoundingClientRect(),
      view = $("#viewport");
    if (zoom > 1) {
      view.scrollTo({
        left: Math.max(
          0,
          ((selected % 16) * r.width) / 16 - view.clientWidth / 2,
        ),
        top: Math.max(
          0,
          (Math.floor(selected / 16) * r.height) / 16 - view.clientHeight / 2,
        ),
      });
    }
    redraw();
  } else if ([" ", "Enter"].includes(e.key)) {
    e.preventDefault();
    if (!inspect) {
      const before = snapshot(),
        was = secondUnlocked(state);
      paint(state, selected, tool);
      changed(before, was);
    } else update();
  } else if (/^[1-6]$/.test(e.key))
    document.querySelector(`[data-tool="${TYPES[+e.key - 1]}"]`).click();
  else if (e.key.toLowerCase() === "i") $("#inspect").click();
});
document.addEventListener("keydown", (e) => {
  if (
    (e.ctrlKey || e.metaKey) &&
    e.key.toLowerCase() === "z" &&
    !["INPUT", "TEXTAREA"].includes(e.target.tagName) &&
    !$("#modal").open
  ) {
    e.preventDefault();
    (e.shiftKey ? $("#redo") : $("#undo")).click();
  }
});
$("#regions").onchange = (e) => {
  endStroke();
  const n = +e.target.value;
  if (n === 1 && !secondUnlocked(state)) return;
  state.active = n;
  revision++;
  undo = [];
  redo = [];
  selected = 0;
  lastDiscovery = null;
  beepKey = "opening";
  setZoom(1);
  labels();
  redraw();
  persist();
};
$("#language").onclick = () => {
  state.settings.lang = state.settings.lang === "en" ? "zh-TW" : "en";
  labels();
  persist();
};
const modal = $("#modal"),
  content = $("#modal-content");
$(".close").onclick = () => modal.close();
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.close();
});
function show(html) {
  endStroke();
  content.innerHTML = html;
  modal.showModal();
}
$("#journal").onclick = () => {
  show(
    `<p class="eyebrow">${L("DISCOVERY JOURNAL", "探索日誌")}</p><h2>${L("Little moments of wonder", "小小的驚喜時刻")}</h2><p>${L("Earned discoveries stay with you, even when the landscape changes.", "即使地景改變，獲得的發現也會一直保留。")}</p><ul>${RECIPES.filter(
      (r) => state.earned.includes(r.id),
    )
      .map(
        (r) =>
          `<li><strong>✧ ${r.title[state.settings.lang]}</strong><p>${r.description[state.settings.lang]}</p></li>`,
      )
      .join(
        "",
      )}</ul><p>${L("There are still stories waiting to be discovered.", "還有故事等待你來發現。")}</p>`,
  );
};
$("#ideas").onclick = () => {
  const h = state.settings.hints ? nearMiss(state) : null;
  show(
    `<p class="eyebrow">BEEP</p><h2>${L("A little wondering…", "一點小小的好奇……")}</h2><p>${h ? h[state.settings.lang] : L("No hurry. Even the smallest island has a story. Try a shape that makes you smile.", "不用著急，最小的島嶼也有故事。試著畫出讓你微笑的形狀吧。")}</p>${h ? `<button id="more-hint">${L("A little more help", "再多一點提示")}</button>` : ""}`,
  );
  if (h)
    $("#more-hint").onclick = () => {
      const r = RECIPES.find((r) => r.hint === h);
      content.querySelector("p:last-of-type").textContent =
        r.description[state.settings.lang];
      $("#more-hint").remove();
    };
};
$("#help").onclick = () =>
  show(
    `<h2>${L("A world at your own pace", "隨心創造你的小世界")}</h2><p>${L("Choose a terrain tool below the sea, then click or drag to paint. Ocean erases. Every tool is free to use.", "在海洋下方選擇地形工具，再點選或拖曳繪製。海洋工具可擦除。所有工具都能自由使用。")}</p><p>${L("Neighbors join automatically. Try rivers, mountain ranges, and settlements together; the world may surprise you.", "相鄰的地形會自動連接。試著結合河流、山脈與村落，也許世界會給你驚喜。")}</p><p>${L("Inspect a feature to choose a compatible appearance. Zoom in for precision; scroll the board to pan. Undo and redo are below the palette.", "檢視地形可選擇相容的外觀。放大可更精準編輯，捲動地圖即可平移。工具列下方可以復原與重做。")}</p><p>${L("Saves are automatic on this browser. Settings lets you export or import a backup, change your name, reduce motion, and mute sounds. BEEP’s ideas are optional.", "進度會自動儲存於此瀏覽器。設定中可匯出或匯入備份、更改稱呼、減少動態效果及靜音。BEEP 的靈感完全自由參考。")}</p>`,
  );
$("#clear").onclick = () => {
  show(
    `<h2>${L("Clear this region?", "清空這個區域？")}</h2><p>${L("Your discoveries and the other region are kept. You can undo this edit.", "你的發現與另一個區域都會保留。你也可以復原這次編輯。")}</p><button id="confirm-clear">${L("Clear region", "清空區域")}</button><button id="cancel-clear">${L("Keep creating", "繼續創作")}</button>`,
  );
  $("#cancel-clear").onclick = () => modal.close();
  $("#confirm-clear").onclick = () => {
    const before = snapshot();
    region().tiles.fill("ocean");
    region().variants = {};
    changed(before, secondUnlocked(state));
    modal.close();
  };
};
$("#settings").onclick = () => {
  show(
    `<h2>${L("Make yourself at home", "讓自己自在創作")}</h2><label>${L("What should BEEP call you?", "BEEP 該怎麼稱呼你？")}<input id="player-name" type="text" maxlength="32" autocomplete="off"></label>${[
      ["hints", "Optional BEEP ideas", "BEEP 的可選靈感"],
      ["mute", "Mute sounds", "靜音"],
      ["reduced", "Reduce motion", "減少動態效果"],
      ["grid", "Show cell guides", "顯示格線"],
    ]
      .map(
        ([id, en, zh]) =>
          `<label><input id="setting-${id}" type="checkbox" ${state.settings[id] ? "checked" : ""}>${L(en, zh)}</label>`,
      )
      .join(
        "",
      )}<button id="export">${L("Export save backup", "匯出存檔備份")}</button><label class="import-label">${L("Import save backup", "匯入存檔備份")}<input id="import-save" type="file" accept=".json,application/json"></label><p id="import-status" role="status"></p><p>${L("Autosaves are local to this browser and site address. Export a backup before changing browsers or clearing site data.", "自動存檔只保留於目前瀏覽器與網站位址。更換瀏覽器或清除網站資料前，請匯出備份。")}</p>`,
  );
  $("#player-name").value = state.settings.name;
  $("#player-name").oninput = (e) => {
    state.settings.name = e.target.value.slice(0, 32);
    scheduleSave();
  };
  for (const k of ["hints", "mute", "reduced", "grid"])
    $("#setting-" + k).onchange = (e) => {
      state.settings[k] = e.target.checked;
      document.body.classList.toggle("reduced", state.settings.reduced);
      redraw();
      persist();
    };
  $("#import-save").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 1000000) throw Error("Large file");
      const imported = decode(await file.text());
      content.innerHTML = `<h2>${L("Replace your worlds with this backup?", "要使用這份備份取代目前的世界嗎？")}</h2><p>${L("Both regions and discoveries will be replaced. Export your current save first if you want to keep it.", "兩個區域與發現都將被取代。如需保留目前進度，請先匯出存檔。")}</p><button id="confirm-import">${L("Import backup", "匯入備份")}</button><button id="cancel-import">${L("Cancel", "取消")}</button>`;
      $("#cancel-import").onclick = () => modal.close();
      $("#confirm-import").onclick = () => {
        state = imported;
        undo = [];
        redo = [];
        revision++;
        selected = 0;
        lastDiscovery = null;
        beepKey = "opening";
        setZoom(1);
        labels();
        redraw();
        persist();
        modal.close();
      };
    } catch {
      $("#import-status").textContent = L(
        "That backup could not be read. Your current world is unchanged.",
        "無法讀取這份備份。目前的世界沒有改變。",
      );
    }
  };
  $("#export").onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "wonderlands-save.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
};
window.addEventListener("pagehide", () => {
  endStroke();
  if (dirty) persist();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    endStroke();
    if (dirty) persist();
  }
});
await renderer.ready;
labels();
renderer.draw(state);
document.body.dataset.ready = "true";
if (recovery && !recoveryPreserved)
  status(
    "Unreadable save kept intact. Backup failed; export your new world before leaving.",
    "無法讀取的原存檔已保留，但備份失敗。離開前請匯出新世界。",
  );
else if (recovery)
  status(
    "Unreadable save preserved as a recovery copy. A new sea is ready.",
    "無法讀取的存檔已保留為復原備份，新的海洋已準備好。",
  );
else if (storageError)
  status(
    "Saving unavailable — export a backup in Settings.",
    "無法儲存，請至設定匯出備份。",
  );
else
  status(
    "Choose a tool, then paint. Everything starts with a little curiosity.",
    "選擇工具，開始描繪。一切都從一點好奇心開始。",
  );
// Read-only diagnostics support reproducible browser verification without a gameplay bypass.
window.wonderlands = {
  getState: () => structuredClone(state),
  getAppearance: (i) => appearance(state, i),
  getHistory: () => ({ undo: undo.length, redo: redo.length }),
};
