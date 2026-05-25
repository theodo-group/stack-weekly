import fs from 'node:fs';
import path from 'node:path';
import { fetchLatestIssues } from '../src/lib/newsletter.js';
import { parseIssue } from '../src/lib/parser.js';

const INDEX_DIR = path.resolve(process.cwd(), 'index');
const BACKFILL = Math.max(1, parseInt(process.env.STACK_WEEKLY_BACKFILL || '4', 10));

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY env var is required');
  }
  fs.mkdirSync(INDEX_DIR, { recursive: true });

  const issues = await fetchLatestIssues(BACKFILL);
  let added = 0;
  let skipped = 0;

  for (const raw of issues) {
    const file = path.join(INDEX_DIR, `issue-${raw.issueNumber}.json`);
    if (fs.existsSync(file)) {
      console.log(`skip #${raw.issueNumber} (already indexed)`);
      skipped++;
      continue;
    }
    console.log(`parsing #${raw.issueNumber} (${raw.items.length} items)…`);
    const tagged = await parseIssue(raw);
    fs.writeFileSync(file, JSON.stringify(tagged, null, 2) + '\n');
    added++;
  }

  console.log(`done: ${added} new, ${skipped} unchanged.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
