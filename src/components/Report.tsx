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

function weekLabel(n: number): string {
  return n === 1 ? '1 week' : `${n} weeks`;
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

export const Report: React.FC<Props> = ({ issues, result, ctx }) => {
  const width = useTermWidth();
  const rule = '━'.repeat(width);
  const flat = result.groups.flatMap((g) => g.items);

  return (
    <Box flexDirection="column">
      <Header issues={issues} rule={rule} />
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">
          Scanning the last {weekLabel(issues.length)} of{' '}
          <Text bold color="white">This Week In React</Text> for items relevant to{' '}
          <Text color="green">{ctx.repoName}</Text>
          <Text color="gray">{` — ${result.totalMatched} match${result.totalMatched === 1 ? '' : 'es'} out of ${result.totalScanned} item${result.totalScanned === 1 ? '' : 's'}.`}</Text>
        </Text>
      </Box>
      {flat.length === 0 ? (
        <Box marginTop={1}>
          <Text color="yellow">∅ nothing matches your stack.</Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {flat.map((m, i) => (
            <Box key={i} flexDirection="column" marginBottom={1}>
              <Item matched={m} />
            </Box>
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
