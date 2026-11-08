// Builds docs/User-Guide.md from the in-app knowledge base (src/js/help-content.js).
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ctx = { globalThis: {} }; ctx.window = ctx.globalThis; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'help-content.js'), 'utf8'), ctx);
const { HELP_CATEGORIES: cats, HELP_ARTICLES: arts } = ctx.window.RS;
const anchor = (t) => t.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/\s+/g, '-');
const titleOf = Object.fromEntries(arts.map((a) => [a.id, a.title]));
const md = (body) => body
  .replace(/\{\{web:([^|}]*)\|desktop:([^}]*)\}\}/g, (_, w, d) => (w && d ? `${w} _(Desktop app: ${d.replace(/^[, ]+/, '')})_` : w || `_(Desktop app: ${d.replace(/^[, ]+/, '')})_`))
  .replace(/\[\[([\w-]+)\|([^\]]+)\]\]/g, (_, id, text) => `[${text}](#${anchor(titleOf[id] || id)})`)
  .replace(/^## /gm, '### ');
let out = `# Reelsmith User Guide\n\n_Generated from the in-app Help Center (press F1 in Reelsmith). Do not edit by hand — edit \`src/js/help-content.js\` and run \`npm run docs\`._\n\n## Contents\n\n`;
for (const c of cats) {
  out += `**${c}**\n\n` + arts.filter((a) => a.cat === c).map((a) => `- [${a.title}](#${anchor(a.title)})`).join('\n') + '\n\n';
}
for (const c of cats) {
  out += `---\n\n# ${c}\n\n`;
  for (const a of arts.filter((x) => x.cat === c)) out += `## ${a.title}\n\n${md(a.body)}\n\n`;
}
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'User-Guide.md'), out);
// sanity: every [[link]] must point at an article
const bad = arts.flatMap((a) => [...a.body.matchAll(/\[\[([\w-]+)\|/g)].map((m) => m[1]).filter((id) => !titleOf[id]).map((id) => a.id + ' → ' + id));
if (bad.length) { console.error('Broken links:', bad.join(', ')); process.exit(1); }
console.log(`docs/User-Guide.md written: ${arts.length} articles in ${cats.length} categories`);
