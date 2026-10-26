const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const results = [],
  errors = [],
  PORT = 4176,
  BASE = `http://127.0.0.1:${PORT}`,
  KEY = "wonderlands.save.v1";
let browser, server;
const contexts = [];
async function fresh(mobile = false) {
  const context = await browser.newContext({
    viewport: mobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1400 },
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: "reduce",
  });
  contexts.push(context);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/art\/island\.png|\/proof\/|art-direction-concept/.test(r.url()))
      errors.push("Static proof asset loaded in game: " + r.url());
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  await page.goto(BASE);
  await page.waitForSelector("body[data-ready=true]");
  return page;
}
const state = (p) => p.evaluate(() => wonderlands.getState());
async function choose(p, t) {
  await p.locator(`[data-tool=${t}]`).click();
  await p.locator("#world").scrollIntoViewIfNeeded();
}
async function pos(p, x, y) {
  const b = await p.locator("#world").boundingBox();
  return {
    x: b.x + ((x + 0.5) * b.width) / 16,
    y: b.y + ((y + 0.5) * b.height) / 16,
  };
}
async function cell(p, x, y) {
  await p.locator("#world").scrollIntoViewIfNeeded();
  const pt = await pos(p, x, y);
  await p.mouse.click(pt.x, pt.y);
}
async function stroke(p, points) {
  await p.locator("#world").scrollIntoViewIfNeeded();
  const first = await pos(p, ...points[0]);
  await p.mouse.move(first.x, first.y);
  await p.mouse.down();
  for (const xy of points.slice(1)) {
    const pt = await pos(p, ...xy);
    await p.mouse.move(pt.x, pt.y, { steps: 2 });
  }
  await p.mouse.up();
}
async function capture(p, file) {
  await p.mouse.move(1, 1);
  await p.waitForTimeout(350);
  await p.screenshot({ path: "evidence/" + file, fullPage: true });
}
async function clear(p) {
  await p.locator("#clear").click();
  await p.locator("#confirm-clear").click();
}
async function check(name, fn) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, status: "passed", milliseconds: Date.now() - start });
    console.log("PASS", name);
  } catch (e) {
    results.push({ name, status: "failed", error: e.message });
    console.error("FAIL", name, e.message);
  }
}
async function sample(p) {
  await choose(p, "land");
  for (let y = 2; y <= 13; y++) {
    const a = Math.max(
        2,
        Math.round(4 - Math.sin(((y - 2) / 11) * Math.PI) * 2),
      ),
      b = Math.min(13, Math.round(10 + Math.sin(((y - 2) / 11) * Math.PI) * 3));
    await stroke(p, [
      [a, y],
      [b, y],
    ]);
  }
  await choose(p, "hill");
  await stroke(p, [
    [4, 5],
    [4, 8],
  ]);
  await cell(p, 9, 10);
  await choose(p, "mountain");
  await stroke(p, [
    [6, 3],
    [8, 3],
    [9, 4],
  ]);
  await choose(p, "river");
  await stroke(p, [
    [8, 4],
    [8, 6],
    [9, 7],
    [9, 9],
    [10, 10],
    [10, 13],
  ]);
  await choose(p, "village");
  for (const xy of [
    [5, 9],
    [6, 9],
    [5, 10],
    [6, 10],
    [12, 9],
  ])
    await cell(p, ...xy);
}
(async () => {
  fs.mkdirSync("evidence", { recursive: true });
  server = spawn(
    "python",
    ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"],
    { stdio: "ignore" },
  );
  try {
    for (let i = 0; i < 50; i++) {
      try {
        if ((await fetch(BASE)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_PATH ||
        (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    });
    await check(
      "All 256 cells, boundary hits, grouped undo/redo and confirmed reset",
      async () => {
        const p = await fresh();
        await choose(p, "land");
        for (let y = 0; y < 16; y++)
          await stroke(p, [
            [0, y],
            [15, y],
          ]);
        assert.equal(
          (await state(p)).regions[0].tiles.filter((t) => t === "land").length,
          256,
        );
        await p.locator("#undo").click();
        assert.equal(
          (await state(p)).regions[0].tiles.filter((t) => t === "land").length,
          240,
        );
        await p.locator("#redo").click();
        assert.equal(
          (await state(p)).regions[0].tiles.filter((t) => t === "land").length,
          256,
        );
        await p.locator("#clear").click();
        await p.locator("#cancel-clear").click();
        assert.equal((await state(p)).regions[0].tiles[255], "land");
        await clear(p);
        assert((await state(p)).regions[0].tiles.every((t) => t === "ocean"));
        assert((await state(p)).earned.includes("A19"));
        await p.locator("#undo").click();
        assert.equal((await state(p)).regions[0].tiles[255], "land");
        await p.keyboard.press("Control+Shift+z");
        assert.equal((await state(p)).regions[0].tiles[255], "ocean");
        await p.close();
      },
    );
    await check(
      "Dynamic illustrated world: blank → painted → river cut → reverse edit → reload",
      async () => {
        const p = await fresh();
        await capture(p, "desktop-before.png");
        await sample(p);
        let s = await state(p);
        assert(s.earned.includes("A14"));
        assert(s.earned.length >= 10);
        assert.equal(
          await p.evaluate(() => wonderlands.getAppearance(9 * 16 + 5)),
          "city",
        );
        await capture(p, "desktop-after.png");
        const before = await p.locator("#world").screenshot();
        const tiles = [...s.regions[0].tiles];
        const pixelHash = () =>
          p.evaluate(() => {
            const d = document
              .querySelector("canvas")
              .getContext("2d")
              .getImageData(0, 0, 1600, 1600).data;
            let h = 0;
            for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) | 0;
            return h;
          });
        const paintedHash = await pixelHash();
        await choose(p, "ocean");
        await stroke(p, [
          [2, 8],
          [13, 8],
        ]);
        assert.notDeepEqual((await state(p)).regions[0].tiles, tiles);
        await capture(p, "desktop-river-cut.png");
        const after = await p.locator("#world").screenshot();
        assert.notEqual(
          crypto.createHash("sha256").update(before).digest("hex"),
          crypto.createHash("sha256").update(after).digest("hex"),
        );
        await p.locator("#undo").click();
        assert.deepEqual((await state(p)).regions[0].tiles, tiles);
        await p.waitForTimeout(50);
        assert.equal(await pixelHash(), paintedHash);
        await choose(p, "ocean");
        await cell(p, 6, 10);
        assert.notEqual(
          await p.evaluate(() => wonderlands.getAppearance(9 * 16 + 5)),
          "city",
        );
        assert((await state(p)).earned.includes("A14"));
        await capture(p, "city-reverted.png");
        await p.locator("#undo").click();
        await p.locator("#save").click();
        s = await state(p);
        await p.reload();
        await p.waitForSelector("body[data-ready=true]");
        assert.deepEqual(await state(p), s);
        assert.equal(await pixelHash(), paintedHash);
        await capture(p, "desktop-reloaded.png");
        assert.equal(await p.locator("#regions option").count(), 2);
        await p.locator("#regions").selectOption("1");
        assert((await state(p)).regions[1].tiles.every((t) => t === "ocean"));
        await choose(p, "land");
        for (let y = 4; y < 11; y++)
          await stroke(p, [
            [4, y],
            [11, y],
          ]);
        await choose(p, "hill");
        await stroke(p, [
          [5, 5],
          [7, 5],
        ]);
        await choose(p, "mountain");
        await stroke(p, [
          [9, 5],
          [9, 7],
        ]);
        await choose(p, "village");
        await cell(p, 10, 8);
        await capture(p, "region-two.png");
        const second = [...(await state(p)).regions[1].tiles];
        await p.locator("#regions").selectOption("0");
        assert.deepEqual((await state(p)).regions[0].tiles, s.regions[0].tiles);
        await p.locator("#regions").selectOption("1");
        assert.deepEqual((await state(p)).regions[1].tiles, second);
        await p.reload();
        await p.waitForSelector("body[data-ready=true]");
        assert.equal((await state(p)).active, 1);
        assert.deepEqual((await state(p)).regions[1].tiles, second);
        await p.locator("#regions").selectOption("0");
        await p.setViewportSize({ width: 390, height: 844 });
        await capture(p, "mobile-gameplay.png");
        await p.close();
      },
    );
    await check(
      "Arbitrary heart layout and isolated archipelago use the same editable renderer",
      async () => {
        const p = await fresh();
        await choose(p, "land");
        for (let y = 1; y < 15; y++) {
          const xs = [];
          for (let x = 1; x < 15; x++) {
            const xx = (x - 7.5) / 6,
              yy = (7.5 - y) / 6;
            if ((xx * xx + yy * yy - 1) ** 3 - xx * xx * yy ** 3 <= 0)
              xs.push(x);
          }
          if (xs.length)
            await stroke(p, [
              [xs[0], y],
              [xs.at(-1), y],
            ]);
        }
        await choose(p, "hill");
        await cell(p, 4, 6);
        await cell(p, 10, 6);
        await capture(p, "arbitrary-heart.png");
        assert(
          (await state(p)).regions[0].tiles.filter((t) => t === "land").length >
            60,
        );
        await clear(p);
        await choose(p, "land");
        for (const [x, y] of [
          [1, 1],
          [7, 6],
          [12, 12],
        ])
          for (let j = 0; j < 2; j++)
            await stroke(p, [
              [x, y + j],
              [x + 1, y + j],
            ]);
        assert((await state(p)).earned.includes("A15"));
        await capture(p, "arbitrary-archipelago.png");
        await p.close();
      },
    );
    await check(
      "Fortress, port, compatible appearance override and reverse mountain edits",
      async () => {
        const p = await fresh();
        await choose(p, "village");
        await cell(p, 5, 5);
        assert.equal(
          await p.evaluate(() => wonderlands.getAppearance(85)),
          "port",
        );
        await choose(p, "mountain");
        for (const xy of [
          [5, 4],
          [6, 5],
          [5, 6],
        ])
          await cell(p, ...xy);
        assert.equal(
          await p.evaluate(() => wonderlands.getAppearance(85)),
          "fortress",
        );
        await capture(p, "fortress-before.png");
        await p.locator("#inspect").click();
        await cell(p, 5, 5);
        await p.locator("#variant").selectOption("ordinary");
        assert.equal(
          await p.evaluate(() => wonderlands.getAppearance(85)),
          "ordinary",
        );
        await p.locator("#variant").selectOption("auto");
        await choose(p, "land");
        await cell(p, 5, 4);
        assert.equal(
          await p.evaluate(() => wonderlands.getAppearance(85)),
          "port",
        );
        await capture(p, "fortress-after.png");
        assert((await state(p)).earned.includes("A10"));
        await p.close();
      },
    );
    await check(
      "Keyboard editing, settings, bilingual journal and save persistence",
      async () => {
        const p = await fresh();
        await p.locator("#world").focus();
        await p.keyboard.press("ArrowRight");
        await p.keyboard.press("2");
        await p.keyboard.press("Space");
        assert.equal((await state(p)).regions[0].tiles[1], "hill");
        await p.locator("#language").click();
        assert.equal(await p.locator("html").getAttribute("lang"), "zh-TW");
        assert.equal(await p.locator("[data-tool=hill]").innerText(), "丘陵");
        await p.locator("#journal").click();
        assert(
          (await p.locator("#modal-content").innerText()).includes(
            "人類的一小塊土地",
          ),
        );
        await p.locator(".close").click();
        await p.locator("#settings").click();
        await p.locator("#player-name").fill("星光");
        await p.locator("#setting-reduced").check();
        await p.locator("#setting-hints").uncheck();
        await p.locator(".close").click();
        await p.locator("#save").click();
        await p.reload();
        await p.waitForSelector("body[data-ready=true]");
        const s = await state(p);
        assert.equal(s.settings.name, "星光");
        assert.equal(s.settings.lang, "zh-TW");
        assert.equal(s.settings.reduced, true);
        assert.equal(s.settings.hints, false);
        await capture(p, "desktop-zh-TW.png");
        await p.locator("#help").click();
        assert(
          (await p.locator("#modal-content").innerText()).includes("隨心創造"),
        );
        await p.locator(".close").click();
        await p.close();
      },
    );
    await check(
      "Mobile touch painting, scroll prevention, zoomed/panned hit testing and reload",
      async () => {
        const p = await fresh(true);
        await choose(p, "land");
        const pt = await pos(p, 4, 4);
        await p.touchscreen.tap(pt.x, pt.y);
        assert.equal((await state(p)).regions[0].tiles[68], "land");
        const cdp = await p.context().newCDPSession(p),
          start = await pos(p, 5, 5),
          end = await pos(p, 9, 5),
          scroll = await p.evaluate(() => scrollY);
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: start.x, y: start.y }],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: end.x, y: end.y }],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        assert.equal(await p.evaluate(() => scrollY), scroll);
        assert.equal((await state(p)).regions[0].tiles[89], "land");
        await p.locator("#zoom-in").tap();
        await p.locator("#zoom-in").tap();
        await p.locator("#viewport").evaluate((e) => {
          e.scrollLeft = 150;
          e.scrollTop = 100;
        });
        await choose(p, "mountain");
        await p.locator("#viewport").evaluate((e) => {
          e.scrollLeft = 150;
          e.scrollTop = 100;
        });
        const zoomPt = await pos(p, 6, 5);
        await p.touchscreen.tap(zoomPt.x, zoomPt.y);
        assert.equal((await state(p)).regions[0].tiles[86], "mountain");
        await p.locator("#zoom-out").tap();
        await p.locator("#zoom-out").tap();
        await p.locator("#viewport").evaluate((e) => {
          e.scrollLeft = 0;
          e.scrollTop = 0;
        });
        await choose(p, "river");
        await p.locator("#world").scrollIntoViewIfNeeded();
        const r = await pos(p, 5, 6);
        await p.touchscreen.tap(r.x, r.y);
        await p.locator("#save").tap();
        const s = await state(p);
        await p.reload();
        await p.waitForSelector("body[data-ready=true]");
        assert.deepEqual(await state(p), s);
        await p.locator("#language").tap();
        await capture(p, "mobile-zh-TW.png");
        for (const width of [320, 390, 768, 1024]) {
          await p.setViewportSize({ width, height: 1000 });
          assert.equal(
            await p.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
            `Overflow at ${width}`,
          );
        }
        await p.close();
      },
    );
    await check(
      "Corrupt saves preserve recovery copy; storage failure stays playable and warns",
      async () => {
        let p = await fresh();
        await p.evaluate((key) => localStorage.setItem(key, "{broken"), KEY);
        await p.reload();
        await p.waitForSelector("body[data-ready=true]");
        assert.equal(
          await p.evaluate(
            (key) => localStorage.getItem(key + ".recovery"),
            KEY,
          ),
          "{broken",
        );
        assert((await p.locator("#status").innerText()).includes("recovery"));
        assert((await state(p)).regions[0].tiles.every((t) => t === "ocean"));
        await p.close();
        const context = await browser.newContext();
        contexts.push(context);
        await context.addInitScript(() => {
          Storage.prototype.setItem = function () {
            throw new DOMException("Quota", "QuotaExceededError");
          };
        });
        p = await context.newPage();
        p.on("pageerror", (e) => errors.push(e.message));
        await p.goto(BASE);
        await p.waitForSelector("body[data-ready=true]");
        await choose(p, "land");
        await cell(p, 1, 1);
        await p.locator("#save").click();
        assert(
          (await p.locator("#status").innerText()).includes(
            "Saving unavailable",
          ),
        );
        assert.equal((await state(p)).regions[0].tiles[17], "land");
        await p.close();
      },
    );
    await check(
      "Deterministic rendering, full-board performance and basic accessible controls",
      async () => {
        const p = await fresh();
        await p.evaluate(async (key) => {
          const { fresh } = await import("/src/core.js");
          const s = fresh();
          s.regions[0].tiles.fill("mountain");
          localStorage.setItem(key, JSON.stringify(s));
        }, KEY);
        await p.reload();
        await p.waitForSelector("body[data-ready=true]");
        await p.mouse.move(1, 1);
        const hash = () =>
          p.evaluate(() => {
            const d = document
              .querySelector("canvas")
              .getContext("2d")
              .getImageData(0, 0, 1600, 1600).data;
            let h = 0;
            for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) | 0;
            return h;
          });
        const before = await hash();
        await p.reload();
        await p.waitForSelector("body[data-ready=true]");
        assert.equal(await hash(), before);
        const metrics = await p.evaluate(async () => {
          const { Renderer } = await import("/src/renderer.js");
          const r = new Renderer(document.createElement("canvas"));
          await r.ready;
          const s = wonderlands.getState();
          if (!s.regions[0].tiles.every((t) => t === "mountain"))
            throw Error("Performance fixture was not loaded");
          const times = [];
          for (let i = 0; i < 5; i++) {
            const start = performance.now();
            r.draw(s);
            times.push(performance.now() - start);
          }
          return {
            drawMilliseconds: times,
            heapBytes: performance.memory?.usedJSHeapSize,
          };
        });
        fs.writeFileSync(
          "evidence/performance.json",
          JSON.stringify(metrics, null, 2),
        );
        assert(
          Math.max(...metrics.drawMilliseconds) < 1500,
          "Severe render stall",
        );
        for (const button of await p.locator("button:visible").all()) {
          assert(
            (await button.innerText()).trim() ||
              (await button.getAttribute("aria-label")),
          );
        }
        await p.close();
      },
    );
    await check(
      "Export and validated import restore worlds; malformed and cancelled imports preserve current state",
      async () => {
        const p = await fresh();
        await choose(p, "hill");
        await cell(p, 3, 3);
        await p.locator("#save").click();
        const original = await state(p);
        await p.locator("#settings").click();
        const downloadPromise = p.waitForEvent("download");
        await p.locator("#export").click();
        const download = await downloadPromise;
        const bytes = fs.readFileSync(await download.path());
        assert.deepEqual(JSON.parse(bytes), original);
        await p
          .locator("#import-save")
          .setInputFiles({
            name: "bad.json",
            mimeType: "application/json",
            buffer: Buffer.from("{bad"),
          });
        await p.waitForFunction(() => document.querySelector('#import-status')?.textContent.includes('could not be read'));
        assert(
          (await p.locator("#import-status").innerText()).includes(
            "could not be read",
          ),
        );
        assert.deepEqual(await state(p), original);
        await p.locator(".close").click();
        await clear(p);
        const cleared = await state(p);
        await p.locator("#settings").click();
        await p
          .locator("#import-save")
          .setInputFiles({
            name: "world.json",
            mimeType: "application/json",
            buffer: bytes,
          });
        await p.locator("#cancel-import").click();
        assert.deepEqual(await state(p), cleared);
        await p.locator("#settings").click();
        await p
          .locator("#import-save")
          .setInputFiles({
            name: "world.json",
            mimeType: "application/json",
            buffer: bytes,
          });
        await p.locator("#confirm-import").click();
        assert.deepEqual(await state(p), original);
        await p.reload();
        await p.waitForSelector("body[data-ready=true]");
        assert.deepEqual(await state(p), original);
        await p.close();
      },
    );
    await check(
      "Diagonal river strokes remain one orthogonally connected network",
      async () => {
        const p = await fresh();
        await choose(p, "river");
        await stroke(p, [
          [2, 2],
          [10, 10],
        ]);
        const groups = await p.evaluate(async () => {
          const { analyze } = await import("/src/core.js");
          return analyze(wonderlands.getState().regions[0].tiles).rivers;
        });
        assert.equal(groups.length, 1);
        assert.equal(groups[0].length, 17);
        await p.close();
      },
    );
    await check("No browser script errors or failed asset requests", async () =>
      assert.deepEqual(errors, []),
    );
  } finally {
    for (const c of contexts) await c.close().catch(() => {});
    if (browser) await browser.close();
    if (server) server.kill();
    fs.writeFileSync(
      "evidence/browser-results.json",
      JSON.stringify(
        {
          runAt: new Date().toISOString(),
          runner: "Chromium via Playwright; desktop and emulated mobile touch",
          results,
          pageErrors: errors,
        },
        null,
        2,
      ),
    );
  }
  if (results.some((r) => r.status === "failed")) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
