import type { TaggedIssue } from './parser.js';
import { loadIssue, saveIssue } from './cache.js';

const INDEX_BASE_URL =
  process.env.STACK_WEEKLY_INDEX_BASE_URL ||
  'https://raw.githubusercontent.com/theodo-group/stack-weekly/main/index';

export async function fetchTaggedIssue(issueNumber: number): Promise<TaggedIssue | null> {
  const cached = loadIssue(issueNumber);
  if (cached) return cached;

  const url = `${INDEX_BASE_URL}/issue-${issueNumber}.json`;
  // Accept-Encoding: identity bypasses GitHub raw's per-encoding cache pool —
  // the gzipped variant can lag the identity one by several minutes after a push.
  const res = await fetch(url, { headers: { 'Accept-Encoding': 'identity' } });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as TaggedIssue;
  saveIssue(json);
  return json;
}
