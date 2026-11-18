// Downloads the CC0 / public-domain photos listed in footage.json (1280 px wide) into scripts/shots/footage/,
// checking each file's licence on Wikimedia Commons first, and writes footage/SOURCES.txt.
'use strict';
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'footage');
const { files } = require('./footage.json');
const UA = { 'user-agent': 'ReelsmithScreenshots/1.0' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const src = [];
  for (const [key, title] of Object.entries(files)) {
    const out = path.join(DIR, key + '.jpg');
    const u = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', titles: title, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1280' });
    let info;
    for (let k = 0; k < 5 && !info; k++) { try { info = Object.values((await (await fetch(u, { headers: UA })).json()).query.pages)[0].imageinfo[0]; } catch { await wait(10000); } }
    if (!info) throw new Error('no info for ' + title);
    const lic = info.extmetadata.LicenseShortName.value;
    if (!/^(CC0|Public domain)$/i.test(lic)) throw new Error(title + ' has licence ' + lic);
    const artist = (info.extmetadata.Artist?.value || '').replace(/<[^>]+>/g, '').trim();
    src.push(`${key}.jpg — ${title.slice(5)} — ${lic}${artist ? ' — ' + artist : ''} — ${info.descriptionurl}`);
    if (!fs.existsSync(out)) {
      for (let k = 0; ; k++) {
        const r = await fetch(info.thumburl, { headers: UA });
        if (r.ok) { fs.writeFileSync(out, Buffer.from(await r.arrayBuffer())); break; }
        if (k > 4) throw new Error('download failed ' + r.status + ' ' + title);
        await wait(8000);
      }
      console.log('got', key, (fs.statSync(out).size / 1024).toFixed(0) + ' KB', lic);
      await wait(1500);
    }
  }
  fs.writeFileSync(path.join(DIR, 'SOURCES.txt'), src.join('\n') + '\n');
})().catch((e) => { console.error(e.message); process.exit(1); });
