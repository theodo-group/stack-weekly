import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type { TaggedIssue } from '../lib/parser.js';
import type { MatchResult, MatchedItem } from '../lib/matcher.js';
import type { StackContext } from '../lib/watchlist.js';

interface Props {
  issues: TaggedIssue[];
  result: MatchResult;
  ctx: StackContext;
}

function useTermWidth(): number {
  const { stdout } = useStdout();
  const cols = stdout?.columns;
  if (!cols || cols < 40) return 100;
  return Math.min(cols, 200);
}

function isoDate(s: string): string {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export const Report: React.FC<Props> = ({ issues, result }) => {
  const width = useTermWidth();
  const rule = '━'.repeat(width);
  const flat = result.groups.flatMap((g) => g.items);

  return (
    <Box flexDirection="column">
      <Header issues={issues} rule={rule} />
      {flat.length === 0 ? (
        <Box marginTop={1}>
          <Text color="yellow">∅ nothing matches your stack.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {flat.map((m, i) => (
            <Item key={i} matched={m} />
          ))}
        </Box>
      )}
    </Box>
  );
};

const Header: React.FC<{
  issues: TaggedIssue[];
  rule: string;
}> = ({ issues, rule }) => {
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

  return (
    <Box flexDirection="column">
      <Text color="cyan">{rule}</Text>
      <Box>
        <Text color="cyan" bold>{'▌ '}</Text>
        <Text bold color="white">stack-weekly</Text>
        <Text color="gray">{' · '}</Text>
        <Text color="magenta" bold>{issueLabel}</Text>
        <Text color="gray">{dateLabel && `  ${dateLabel}`}</Text>
      </Box>
      <Text color="cyan">{rule}</Text>
    </Box>
  );
};

const Item: React.FC<{ matched: MatchedItem }> = ({ matched }) => {
  const { item, reasons } = matched;
  const emoji = item.itemEmoji || '·';
  const allRelated = reasons.length > 0 && reasons.every((r) => r.kind === 'related');
  const allExtras =
    !allRelated && reasons.length > 0 && reasons.every((r) => r.kind === 'package' && r.viaExtras);
  const color = allRelated ? 'magenta' : allExtras ? 'cyan' : 'green';
  const badges = reasons
    .map((r) => {
      if (r.kind === 'related') return `◇ ${r.name}`;
      return `${r.viaExtras ? '☆' : '★'} ${r.name}`;
    })
    .join('  ');
  return (
    <Box flexDirection="column">
      <Text>
        <Text color="yellow">{emoji} </Text>
        <Text bold color="white">{item.title}</Text>
        <Text>  </Text>
        <Text color={color}>{badges}</Text>
      </Text>
      <Text>
        <Text color="gray">   ↗ </Text>
        <Text color="blue">{item.url}</Text>
      </Text>
    </Box>
  );
};
