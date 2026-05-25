import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { TaggedIssue } from './parser.js';

const CACHE_DIR = path.join(os.homedir(), '.cache', 'stack-weekly');

function ensureDir(): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export function cachePath(issueNumber: number): string {
  return path.join(CACHE_DIR, `issue-${issueNumber}.json`);
}

export function loadIssue(issueNumber: number): TaggedIssue | null {
  const file = cachePath(issueNumber);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as TaggedIssue;
  } catch {
    return null;
  }
}

export function saveIssue(issue: TaggedIssue): string {
  ensureDir();
  const file = cachePath(issue.issueNumber);
  fs.writeFileSync(file, JSON.stringify(issue, null, 2) + '\n');
  return file;
}

export function listCachedIssues(): number[] {
  if (!fs.existsSync(CACHE_DIR)) return [];
  return fs
    .readdirSync(CACHE_DIR)
    .map((f) => f.match(/^issue-(\d+)\.json$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => parseInt(m[1], 10))
    .sort((a, b) => b - a);
}

export function loadLatestCached(): TaggedIssue | null {
  const issues = listCachedIssues();
  return issues.length ? loadIssue(issues[0]) : null;
}

export { CACHE_DIR };
