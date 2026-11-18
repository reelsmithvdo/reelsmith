// Puts the three phone-layout screenshots (scenes phone-a/b/c, written to RS_SHOT_DIR) side by side in one
// 16:9 image for the blog: npx electron scripts/shots/combine-phone.js  → src/assets/shots/phone.jpg
'use strict';
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const DIR = process.env.RS_SHOT_DIR || os.tmpdir();
const OUT = path.join(__dirname, '..', '..', 'src', 'assets', 'shots', 'phone.jpg');
const img = (n) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(DIR, 'phone-' + n + '.jpg')).toString('base64');
const html = `<body style="margin:0;width:1500px;height:844px;background:#15171c;display:flex;align-items:center;justify-content:center;gap:48px">
${['a', 'b', 'c'].map((n) => `<img src="${img(n)}" style="width:351px;height:760px;border-radius:26px;border:1px solid #2c3038;box-shadow:0 18px 50px rgba(0,0,0,.45)">`).join('')}</body>`;
app.whenReady().then(async () => {
  const w = new BrowserWindow({ width: 1500, height: 844, useContentSize: true, show: false });
  await w.loadURL('data:text/html;base64,' + Buffer.from(html).toString('base64'));
  await new Promise((r) => setTimeout(r, 500));
  fs.writeFileSync(OUT, (await w.capturePage()).resize({ width: 1500 }).toJPEG(86));
  console.log('wrote', OUT);
  app.exit(0);
});
