import React, { useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { fetchLatestIssueNumbers } from '../lib/newsletter.js';
import type { TaggedIssue, TaggedItem } from '../lib/parser.js';
import { fetchTaggedIssue } from '../lib/index-fetcher.js';
import { readStackContext } from '../lib/watchlist.js';
import type { StackContext } from '../lib/watchlist.js';
import { matchItems } from '../lib/matcher.js';
import type { MatchResult } from '../lib/matcher.js';
import { Report } from '../components/Report.js';

interface Props {
  directory: string;
  issue?: number;
  weeks?: number;
}

type Phase =
  | { step: 'loading' }
  | { step: 'no-stack' }
  | { step: 'fetching' }
  | { step: 'done'; issues: TaggedIssue[]; result: MatchResult; ctx: StackContext; missing: number[] }
  | { step: 'error'; message: string };

export const ShowCommand: React.FC<Props> = ({ directory, issue, weeks }) => {
  const [state, setState] = useState<Phase>({ step: 'loading' });
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
        if (issueNumbers.length === 0) throw new Error('feed returned no issues');

        const tagged: TaggedIssue[] = [];
        const missing: number[] = [];
        for (const n of issueNumbers) {
          const t = await fetchTaggedIssue(n);
          if (t) tagged.push(t);
          else missing.push(n);
        }

        tagged.sort((a, b) => b.issueNumber - a.issueNumber);

        if (tagged.length === 0) {
          setState({
            step: 'error',
            message:
              missing.length > 0
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
      } catch (err) {
        setState({
          step: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
        setTimeout(() => exit(), 50);
      }
    })();
  }, []);

  if (state.step === 'loading') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> reading stack…</Text>
      </Box>
    );
  }

  if (state.step === 'no-stack') {
    return (
      <Box flexDirection="column">
        <Text color="yellow">no package.json or .stack-weekly-extras.json found in {directory}.</Text>
        <Text color="gray">cd into a JS/TS project, or add a .stack-weekly-extras.json with packages to track.</Text>
      </Box>
    );
  }

  if (state.step === 'fetching') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> fetching index…</Text>
      </Box>
    );
  }

  if (state.step === 'done') {
    return (
      <Box flexDirection="column">
        <Report issues={state.issues} result={state.result} ctx={state.ctx} />
        {state.missing.length > 0 && (
          <Box marginTop={1}>
            <Text color="yellow">
              note: issue{state.missing.length === 1 ? '' : 's'} #{state.missing.join(', #')} not yet
              indexed (waiting for Friday's run).
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  return <Text color="red">error: {state.message}</Text>;
};

function mergeItems(issues: TaggedIssue[]): TaggedItem[] {
  const seen = new Set<string>();
  const out: TaggedItem[] = [];
  for (const issue of issues) {
    for (const item of issue.items) {
      const key = item.url || `${issue.issueNumber}:${item.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
