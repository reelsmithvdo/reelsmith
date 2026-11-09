// Recalculate the stored SEO score of every post (after changing the checks).
import fs from 'fs';
import { MongoClient } from 'mongodb';
import { seoReport } from '../lib/score.js';
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => /^\w+=/.test(l)).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; }));
const c = new MongoClient(env.MONGODB_URI); await c.connect();
const posts = c.db(env.MONGODB_DB || 'reelsmith').collection('posts');
const all = await posts.find().toArray();
for (const p of all) { const others = all.filter((x) => String(x._id) !== String(p._id) && x.focusKeyword).map((x) => ({ title: x.title, focusKeyphrase: x.focusKeyword })); await posts.updateOne({ _id: p._id }, { $set: { seoScore: seoReport(p, others).score } }); }
console.log('Rescored', all.length, 'posts:', (await posts.find({}, { projection: { slug: 1, seoScore: 1 } }).toArray()).map((p) => p.slug.slice(0, 18) + '=' + p.seoScore).join(' '));
await c.close();
