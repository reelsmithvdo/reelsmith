#!/usr/bin/env node
// Reelsmith test suite — like PHPUnit for this app.
//
//   npm test                     all specs, all modes (except slow ones)
//   npm test -- timeline         only specs whose file name contains "timeline"
//   npm test -- --mode=phone     only one mode: web | phone | tablet | desktop
//   npm test -- --slow           also run slow tests (auto captions download a ~50 MB model)
//   npm test -- --show           show the test window instead of running hidden
//
// Each mode starts its own Electron process (tests/runner.js) that loads the editor:
//   web      the website (served over http, no desktop bridge) in a 1440×900 window
//   phone    the website emulating a 390×844 touch phone
//   tablet   the website emulating an 820×1180 touch tablet (iPad portrait)
//   desktop  the real desktop app (main.js + preload)
'use strict';
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const opt = (k) => { const a = args.find((x) => x.startsWith('--' + k)); return a ? (a.includes('=') ? a.split('=')[1] : true) : null; };
const filters = args.filter((a) => !a.startsWith('--'));
const MODES = opt('mode') ? [opt('mode')] : ['web', 'phone', 'tablet', 'desktop'];
const specDir = path.join(__dirname, 'specs');
const specs = fs.readdirSync(specDir).filter((f) => f.endsWith('.test.js') && (!filters.length || filters.some((x) => f.includes(x))));
if (!specs.length) { console.error('No specs match', filters.join(' ')); process.exit(1); }

const electron = require('electron'); // path to the Electron binary
const results = [];
const t0 = Date.now();

function runMode(mode) {
  return new Promise((resolve) => {
    const env = Object.assign({}, process.env, {
      RS_TEST_MODE: mode, RS_TEST_SPECS: specs.join(','), RS_TEST_SLOW: opt('slow') ? '1' : '', RS_TEST_SHOW: opt('show') ? '1' : '',
      ELECTRON_ENABLE_LOGGING: '', ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    });
    const p = spawn(electron, [path.join(__dirname, 'runner.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    const onLine = (line) => {
      if (line.startsWith('@@RESULT ')) { const r = JSON.parse(line.slice(9)); results.push(r); print(r); }
      else if (line.startsWith('@@LOG ')) console.log('      ' + line.slice(6));
      else if (/^\[\d+:\d+\/|OpenH264|^\s*$|Electron Security|deprecated/.test(line)) { /* engine noise */ }
      else if (process.env.RS_TEST_VERBOSE) console.log('      | ' + line);
    };
    p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { onLine(buf.slice(0, i)); buf = buf.slice(i + 1); } });
    p.stderr.on('data', (d) => { if (process.env.RS_TEST_VERBOSE) process.stderr.write(d); });
    const timer = setTimeout(() => { console.log(`  ${mode}: timed out`); p.kill('SIGKILL'); }, 15 * 60 * 1000);
    p.on('exit', (code) => { clearTimeout(timer); if (code && !results.some((r) => r.mode === mode)) results.push({ mode, spec: '(runner)', test: 'start', ok: false, msg: 'runner exited with code ' + code }); resolve(); });
  });
}

let lastHead = '';
function print(r) {
  const head = `${r.mode} › ${r.spec}`;
  if (head !== lastHead) { console.log('\n  ' + head); lastHead = head; }
  const mark = r.skipped ? '\x1b[33m-\x1b[0m' : r.ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`    ${mark} ${r.test}${r.ms != null ? `  \x1b[2m${r.ms} ms\x1b[0m` : ''}${r.skipped ? '  (skipped: ' + r.msg + ')' : ''}`);
  if (!r.ok && !r.skipped) console.log('      \x1b[31m' + String(r.msg).split('\n').join('\n      ') + '\x1b[0m');
}

(async () => {
  console.log(`Reelsmith tests — ${specs.length} spec file(s), modes: ${MODES.join(', ')}`);
  for (const m of MODES) await runMode(m);
  const fail = results.filter((r) => !r.ok && !r.skipped), skip = results.filter((r) => r.skipped);
  console.log(`\n${results.length - fail.length - skip.length} passed, ${fail.length} failed, ${skip.length} skipped — ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (fail.length) { console.log('\nFailures:'); for (const r of fail) console.log(`  ✗ ${r.mode} › ${r.spec} › ${r.test}\n      ${String(r.msg).split('\n')[0]}`); }
  process.exit(fail.length ? 1 : 0);
})();
