// Deployment-only smoke: isolated browser contexts never touch a player's save.
const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const url = process.argv[2];
assert(url && /^https?:\/\//.test(url), 'Pass the deployed site URL');
const base = url.endsWith('/') ? url : url + '/';
const files = ['index.html', 'style.css', 'src/app.js', 'src/core.js', 'src/renderer.js', 'art/icon.svg', 'art/ocean.png', 'art/terrain-atlas.png', 'art/ground-textures.png'];
const manifest = spawnSync('python', ['-c', `import sys,zipfile,json,hashlib
with zipfile.ZipFile('release/Wonderlands-v1.0.0.zip') as z:
 print(json.dumps({p:hashlib.sha256(z.read('Wonderlands/'+p)).hexdigest() for p in json.loads(sys.argv[1])}))`, JSON.stringify(files)], { encoding: 'utf8' });
assert.equal(manifest.status, 0, 'Read release integrity manifest');
const expected = JSON.parse(manifest.stdout);
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const report = { url: base, status: 'running', checks: [], errors: [] };
(async () => {
  fs.mkdirSync('evidence', { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
    const request = await browser.newContext();
    let ready = false;
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        const response = await request.request.get(base, { timeout: 15000 });
        if (response.ok() && digest(await response.body()) === expected['index.html']) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    assert(ready, 'Public site must serve the exact v1.0.0 index');
    for (const file of files) {
      const response = await request.request.get(new URL(file, base).href);
      assert(response.ok(), `${file}: HTTP ${response.status()}`);
      assert.equal(digest(await response.body()), expected[file], `${file} matches the approved release`);
    }
    report.checks.push('All runtime files match the unchanged v1.0.0 ZIP by SHA-256');
    await request.close();
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1200 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.waitForSelector('body[data-ready=true]');
      assert((await page.evaluate(() => wonderlands.getState().regions[0].tiles)).every(t => t === 'ocean'));
      await page.locator('[data-tool=land]').click();
      await page.locator('#world').scrollIntoViewIfNeeded();
      const rect = await page.locator('#world').boundingBox();
      const x = rect.x + rect.width * 1.5 / 16, y = rect.y + rect.height * 1.5 / 16;
      if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
      await page.locator('#save').click();
      assert.equal(await page.evaluate(() => wonderlands.getState().regions[0].tiles[17]), 'land');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('body[data-ready=true]');
      assert.equal(await page.evaluate(() => wonderlands.getState().regions[0].tiles[17]), 'land');
      await page.locator('#language').click();
      assert.equal(await page.locator('html').getAttribute('lang'), 'zh-TW');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `evidence/deployment-smoke-${mobile ? 'mobile' : 'desktop'}.png`, fullPage: true });
      report.checks.push(`${mobile ? 'Mobile touch' : 'Desktop'}: load, edit, saved reload, language switch, layout`);
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    report.status = 'passed';
    console.log(`Deployment smoke passed: ${base}`);
  } catch (error) {
    report.status = 'failed'; report.failure = error.message; throw error;
  } finally {
    if (browser) await browser.close();
    report.checkedAt = new Date().toISOString();
    fs.writeFileSync('evidence/deployment-smoke.json', JSON.stringify(report, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
