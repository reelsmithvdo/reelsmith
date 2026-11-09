// Copy the local test database (reelsmith_dev) to the live one (reelsmith): posts, categories and media.
// Run this right before pushing content that was prepared locally, otherwise the live site's hourly
// publish rebuilds content/posts.json from the old live posts and undoes the local work.
//   node --env-file=.env.local scripts/promote-dev.mjs --yes
// Users and settings (login, last publish) are left as they are.
import { MongoClient } from 'mongodb';
if (!process.argv.includes('--yes')) { console.log('Dry run. Add --yes to copy reelsmith_dev → reelsmith (posts, categories, media).'); }
const c = await MongoClient.connect(process.env.MONGODB_URI);
const src = c.db('reelsmith_dev'), dst = c.db('reelsmith');
for (const name of ['posts', 'categories', 'media.files', 'media.chunks']) {
  const docs = await src.collection(name).find({}).toArray();
  const before = await dst.collection(name).countDocuments();
  console.log(`${name}: ${before} live → ${docs.length} from dev`);
  if (process.argv.includes('--yes')) { await dst.collection(name).deleteMany({}); if (docs.length) await dst.collection(name).insertMany(docs); }
}
await c.close();
