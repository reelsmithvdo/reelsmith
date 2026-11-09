// Adds a content fingerprint (?v=…) to every script and stylesheet in src/index.html, plus a build id
// (<meta name="rs-build">) used for workers. When a file changes, its address changes, so browsers
// download the new version instead of reusing an old cached copy.
// Run by `npm run site`; `npm test` fails if the stamps are out of date.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = path.join(__dirname, '..', 'src');
const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);

function stamped() {
  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const all = crypto.createHash('sha256');
  html = html.replace(/(<script src="|<link rel="stylesheet" href=")([^"?]+)(?:\?v=[0-9a-f]+)?"/g, (m, pre, file) => {
    const buf = fs.readFileSync(path.join(SRC, file));
    all.update(buf);
    return `${pre}${file}?v=${hash(buf)}"`;
  });
  // Files loaded from code (Web Worker, audio worklet) are part of the build id too.
  for (const f of ['js/whisper-worker.js', 'js/worklets/gate.js']) all.update(fs.readFileSync(path.join(SRC, f)));
  const id = all.digest('hex').slice(0, 10);
  html = html.replace(/<meta name="rs-build" content="[^"]*">/, `<meta name="rs-build" content="${id}">`);
  if (!/name="rs-build"/.test(html)) html = html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n  <meta name="rs-build" content="${id}">`);
  return html;
}

module.exports = { stamped };
if (require.main === module) {
  const file = path.join(SRC, 'index.html');
  const next = stamped();
  const changed = next !== fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, next);
  console.log(changed ? 'index.html: asset fingerprints updated' : 'index.html: fingerprints already up to date');
}
