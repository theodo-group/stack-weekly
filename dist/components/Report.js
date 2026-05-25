import React from 'react';
import { Box, Text, useStdout } from 'ink';
function useTermWidth() {
    const { stdout } = useStdout();
    const cols = stdout?.columns;
    if (!cols || cols < 40)
        return 100;
    return Math.min(cols, 200);
}
function isoDate(s) {
    if (!s)
        return '';
    const d = new Date(s);
    if (isNaN(d.getTime()))
        return '';
    return d.toISOString().slice(0, 10);
}
export const Report = ({ issues, result }) => {
    const width = useTermWidth();
    const rule = '━'.repeat(width);
    const flat = result.groups.flatMap((g) => g.items);
    return (React.createElement(Box, { flexDirection: "column" },
        React.createElement(Header, { issues: issues, rule: rule }),
        flat.length === 0 ? (React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "yellow" }, "\u2205 nothing matches your stack."))) : (React.createElement(Box, { flexDirection: "column", marginTop: 1 }, flat.map((m, i) => (React.createElement(Item, { key: i, matched: m })))))));
};
const Header = ({ issues, rule }) => {
    const newest = issues[0];
    const oldest = issues[issues.length - 1];
    const isRange = issues.length > 1;
    const issueLabel = isRange
        ? `#${oldest.issueNumber}–#${newest.issueNumber}`
        : `#${newest.issueNumber}`;
    const newestDate = isoDate(newest.pubDate);
    const oldestDate = isoDate(oldest.pubDate);
    const dateLabel = isRange && oldestDate && newestDate && oldestDate !== newestDate
        ? `${oldestDate} → ${newestDate}`
        : newestDate;
    return (React.createElement(Box, { flexDirection: "column" },
        React.createElement(Text, { color: "cyan" }, rule),
        React.createElement(Box, null,
            React.createElement(Text, { color: "cyan", bold: true }, '▌ '),
            React.createElement(Text, { bold: true, color: "white" }, "stack-weekly"),
            React.createElement(Text, { color: "gray" }, ' · '),
            React.createElement(Text, { color: "magenta", bold: true }, issueLabel),
            React.createElement(Text, { color: "gray" }, dateLabel && `  ${dateLabel}`)),
        React.createElement(Text, { color: "cyan" }, rule)));
};
const Item = ({ matched }) => {
    const { item, reasons } = matched;
    const emoji = item.itemEmoji || '·';
    const allRelated = reasons.length > 0 && reasons.every((r) => r.kind === 'related');
    const allExtras = !allRelated && reasons.length > 0 && reasons.every((r) => r.kind === 'package' && r.viaExtras);
    const color = allRelated ? 'magenta' : allExtras ? 'cyan' : 'green';
    const badges = reasons
        .map((r) => {
        if (r.kind === 'related')
            return `◇ ${r.name}`;
        return `${r.viaExtras ? '☆' : '★'} ${r.name}`;
    })
        .join('  ');
    return (React.createElement(Box, { flexDirection: "column" },
        React.createElement(Text, null,
            React.createElement(Text, { color: "yellow" },
                emoji,
                " "),
            React.createElement(Text, { bold: true, color: "white" }, item.title),
            React.createElement(Text, null, "  "),
            React.createElement(Text, { color: color }, badges)),
        React.createElement(Text, null,
            React.createElement(Text, { color: "gray" }, "   \u2197 "),
            React.createElement(Text, { color: "blue" }, item.url))));
};
