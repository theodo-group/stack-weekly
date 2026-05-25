#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { ShowCommand } from './commands/showCmd.js';

const program = new Command();

program
  .name('stack-weekly')
  .description('Weekly digest from This Week In React, filtered for your package.json')
  .version('0.3.0');

program
  .command('show', { isDefault: true })
  .description('Show matches for the current project (last 2 weeks by default)')
  .option('-d, --directory <path>', 'Project directory', process.cwd())
  .option('-i, --issue <n>', 'Specific issue number')
  .option('-w, --weeks <n>', 'How many recent issues to include', '2')
  .action((opts: { directory: string; issue?: string; weeks?: string }) => {
    const issueNum = opts.issue ? parseInt(opts.issue, 10) : undefined;
    const weeks = opts.weeks ? Math.max(1, parseInt(opts.weeks, 10)) : 2;
    render(
      <ShowCommand directory={opts.directory} issue={issueNum} weeks={weeks} />,
    );
  });

program.parse();
