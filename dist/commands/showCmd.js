import React, { useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { fetchLatestIssueNumbers } from '../lib/newsletter.js';
import { fetchTaggedIssue } from '../lib/index-fetcher.js';
import { readStackContext } from '../lib/watchlist.js';
import { matchItems } from '../lib/matcher.js';
import { Report } from '../components/Report.js';
export const ShowCommand = ({ directory, issue, weeks }) => {
    const [state, setState] = useState({ step: 'loading' });
    const { exit } = useApp();
    useEffect(() => {
        (async () => {
            try {
                const ctx = readStackContext(directory);
                if (!ctx) {
                    setState({ step: 'no-stack' });
                    setTimeout(() => exit(), 50);
                    return;
                }
                setState({ step: 'fetching' });
                const issueNumbers = issue
                    ? [issue]
                    : await fetchLatestIssueNumbers(weeks ?? 2);
                if (issueNumbers.length === 0)
                    throw new Error('feed returned no issues');
                const tagged = [];
                const missing = [];
                for (const n of issueNumbers) {
                    const t = await fetchTaggedIssue(n);
                    if (t)
                        tagged.push(t);
                    else
                        missing.push(n);
                }
                tagged.sort((a, b) => b.issueNumber - a.issueNumber);
                if (tagged.length === 0) {
                    setState({
                        step: 'error',
                        message: missing.length > 0
                            ? `none of issues #${missing.join(', #')} have been indexed yet. Friday's run will pick them up.`
                            : 'no issues to display',
                    });
                    setTimeout(() => exit(), 50);
                    return;
                }
                const merged = mergeItems(tagged);
                const result = matchItems(merged, ctx);
                setState({ step: 'done', issues: tagged, result, ctx, missing });
                setTimeout(() => exit(), 50);
            }
            catch (err) {
                setState({
                    step: 'error',
                    message: err instanceof Error ? err.message : String(err),
                });
                setTimeout(() => exit(), 50);
            }
        })();
    }, []);
    if (state.step === 'loading') {
        return (React.createElement(Box, null,
            React.createElement(Text, { color: "cyan" },
                React.createElement(Spinner, { type: "dots" })),
            React.createElement(Text, null, " reading stack\u2026")));
    }
    if (state.step === 'no-stack') {
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Text, { color: "yellow" },
                "no package.json or .stack-weekly-extras.json found in ",
                directory,
                "."),
            React.createElement(Text, { color: "gray" }, "cd into a JS/TS project, or add a .stack-weekly-extras.json with packages to track.")));
    }
    if (state.step === 'fetching') {
        return (React.createElement(Box, null,
            React.createElement(Text, { color: "cyan" },
                React.createElement(Spinner, { type: "dots" })),
            React.createElement(Text, null, " fetching index\u2026")));
    }
    if (state.step === 'done') {
        return (React.createElement(Box, { flexDirection: "column" },
            React.createElement(Report, { issues: state.issues, result: state.result, ctx: state.ctx }),
            state.missing.length > 0 && (React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "yellow" },
                    "note: issue",
                    state.missing.length === 1 ? '' : 's',
                    " #",
                    state.missing.join(', #'),
                    " not yet indexed (waiting for Friday's run).")))));
    }
    return React.createElement(Text, { color: "red" },
        "error: ",
        state.message);
};
function mergeItems(issues) {
    const seen = new Set();
    const out = [];
    for (const issue of issues) {
        for (const item of issue.items) {
            const key = item.url || `${issue.issueNumber}:${item.title}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            out.push(item);
        }
    }
    return out;
}
