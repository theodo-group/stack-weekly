import { loadIssue, saveIssue } from './cache.js';
const INDEX_BASE_URL = process.env.STACK_WEEKLY_INDEX_BASE_URL ||
    'https://raw.githubusercontent.com/theodo-group/stack-weekly/main/index';
export async function fetchTaggedIssue(issueNumber) {
    const cached = loadIssue(issueNumber);
    if (cached)
        return cached;
    const url = `${INDEX_BASE_URL}/issue-${issueNumber}.json`;
    const res = await fetch(url);
    if (res.status === 404)
        return null;
    if (!res.ok) {
        throw new Error(`failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json());
    saveIssue(json);
    return json;
}
