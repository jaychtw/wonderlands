const { chromium } = require('playwright');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
(async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'wonderlands-release-'));
  const extract = spawnSync('python', ['-c', 'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', 'release/Wonderlands-v1.0.0.zip', folder]);
  assert.equal(extract.status, 0);
  const server = spawn('python', ['-m', 'http.server', '4177', '--bind', '127.0.0.1', '--directory', folder], { stdio: 'ignore' });
  let browser;
  const errors = [];
  try {
    for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:4177/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']});
    const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
    await page.goto('http://127.0.0.1:4177/Wonderlands/');
    await page.waitForSelector('body[data-ready=true]');
    assert((await page.evaluate(()=>wonderlands.getState().regions[0].tiles)).every(t=>t==='ocean'));
    const box=await page.locator('#world').boundingBox();
    await page.touchscreen.tap(box.x+box.width/32,box.y+box.height/32);
    await page.locator('#save').tap();
    await page.reload();await page.waitForSelector('body[data-ready=true]');
    assert.equal(await page.evaluate(()=>wonderlands.getState().regions[0].tiles[0]),'land');
    assert.deepEqual(errors,[]);
    fs.writeFileSync('evidence/release-smoke.json',JSON.stringify({status:'passed',checks:['ZIP integrity','Subpath hosting','Runtime assets loaded','Touch editing','Saved state after reload'],scriptErrors:errors},null,2));
    console.log('Release ZIP smoke passed: subpath, assets, touch edit and reload.');
  } finally {if(browser)await browser.close();server.kill();fs.rmSync(folder,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
