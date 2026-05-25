import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const CACHE_DIR = path.join(os.homedir(), '.cache', 'stack-weekly');
function ensureDir() {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}
export function cachePath(issueNumber) {
    return path.join(CACHE_DIR, `issue-${issueNumber}.json`);
}
export function loadIssue(issueNumber) {
    const file = cachePath(issueNumber);
    if (!fs.existsSync(file))
        return null;
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch {
        return null;
    }
}
export function saveIssue(issue) {
    ensureDir();
    const file = cachePath(issue.issueNumber);
    fs.writeFileSync(file, JSON.stringify(issue, null, 2) + '\n');
    return file;
}
export function listCachedIssues() {
    if (!fs.existsSync(CACHE_DIR))
        return [];
    return fs
        .readdirSync(CACHE_DIR)
        .map((f) => f.match(/^issue-(\d+)\.json$/))
        .filter((m) => !!m)
        .map((m) => parseInt(m[1], 10))
        .sort((a, b) => b - a);
}
export function loadLatestCached() {
    const issues = listCachedIssues();
    return issues.length ? loadIssue(issues[0]) : null;
}
export { CACHE_DIR };
