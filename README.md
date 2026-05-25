# stack-weekly

A weekly digest of [**This Week In React**](https://thisweekinreact.com/), filtered against your project's `package.json`. Tells you which items are actually relevant to your stack — releases of packages you use, security advisories that hit your deps, comparison articles that name your libraries, and alternatives to packages you have installed.

## Why

The newsletter is great, but most weeks half the items don't apply to your stack. Reading carefully takes 20 minutes; reading filtered takes 30 seconds.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌ stack-weekly · #281–#282  2026-05-13 → 2026-05-20
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 React Hook Form 7.76 - Improved isDirty and useFieldArray  ★ react-hook-form
   ↗ https://github.com/react-hook-form/react-hook-form/releases/tag/v7.76.0
📜 React Native Pressable faster than gesture handler  ★ react-native-gesture-handler  ★ react-native-reanimated
   ↗ https://www.peterp.me/articles/...
⭐ Redraw - 2D graphics primitives, powered by WebGPU  ◇ react-native-reanimated
   ↗ https://wcandillon.github.io/redraw/
```

## How it works

1. A **GitHub Action** runs every Friday at 07:00 UTC. It fetches the latest issues from the newsletter's RSS feed, sends each one to GPT-4o **once**, gets back a tagged index (per-item npm package IDs + related/competing libraries), and commits the result under `index/issue-NNN.json` in this repo.
2. The **CLI** does no LLM work. On each run it reads your `package.json`, fetches the last 2 indexed issues from `raw.githubusercontent.com`, and matches package names locally. Cached in `~/.cache/stack-weekly/`.

This means: parsing happens once per issue, shared across all users. The CLI itself is free and offline-friendly.

## Install

```bash
git clone git@github.com:theodo-group/stack-weekly.git
cd stack-weekly
npm install
npm run build
npm link    # makes `stack-weekly` available globally
```

## Use

From any project with a `package.json`:

```bash
stack-weekly                  # last 2 weeks
stack-weekly --weeks 4        # last 4 weeks
stack-weekly --issue 282      # specific issue
stack-weekly --directory ../some-other-project
```

### Opting in to extra packages

If you want updates for packages you don't have installed yet (libraries you're evaluating, devtools your team uses but aren't in `package.json`), drop a `.stack-weekly-extras.json` in the project root:

```json
["rozenite", "@shopify/react-native-skia"]
```

These show up with `☆` (extras match) instead of `★` (direct dependency match).

## Match glyphs

| Glyph | Meaning |
| ----- | ------- |
| `★ pkg` | Item tags a package in your `package.json` (direct hit) |
| `☆ pkg` | Item tags a package in your `.stack-weekly-extras.json` |
| `◇ pkg` | Item is an alternative/competitor/complement to a package you have (only fires when no direct hit exists) |
| `⭐` (item emoji) | The featured "headline" item of a section in the newsletter |

## Index update workflow

The Friday cron lives in `.github/workflows/update-index.yml`. To trigger it manually:

```bash
gh workflow run update-index -R theodo-group/stack-weekly
```

To re-parse an issue (e.g. after tweaking the GPT prompt in `src/lib/parser.ts`):

```bash
# delete the stale file, then trigger the workflow
gh api -X DELETE /repos/theodo-group/stack-weekly/contents/index/issue-NNN.json -f message='...'
gh workflow run update-index -R theodo-group/stack-weekly
```

Required repo secret: `OPENAI_API_KEY`.

## Tuning matches

If a match looks wrong, the fix is almost always in the GPT system prompt at `src/lib/parser.ts`. The prompt enforces a hard rule: **tag a package only if reading the item would make a user of that package update their repo or reconsider their code**. Specifically:

- 📦 release of a package → tag that package
- Security advisory or breaking change → tag affected packages
- Tutorial/how-to focused on a package's API → tag that package
- Comparison/migration/perf article naming a package → tag that package
- Articles that merely mention a package → no tag
- News about ecosystems (TC39, npm, bun, Chrome) → no tag
- The bare strings `"react"` and `"react-native"` are never tagged — they'd match for every RN user

After editing the prompt, delete the affected `index/issue-NNN.json` files and re-run the workflow.

## Project layout

```
src/
  cli.tsx                     Commander entry point
  commands/showCmd.tsx        Ink UI orchestration: fetch → match → render
  components/Report.tsx       Ink renderer (flat list, no chrome)
  lib/
    newsletter.ts             RSS + HTML parsing (with featured-item capture)
    parser.ts                 GPT prompt + invocation (CI-only)
    cache.ts                  ~/.cache/stack-weekly local cache
    index-fetcher.ts          Fetch from raw.githubusercontent + cache
    watchlist.ts              Reads package.json + .stack-weekly-extras.json
    matcher.ts                Pure-local package matching
    env.ts                    OPENAI_API_KEY resolution (script path only)
scripts/
  update-index.ts             CI script: parse missing issues, write index/
index/
  issue-NNN.json              Committed parsed issues
.github/workflows/
  update-index.yml            Friday 07:00 UTC cron
```

## License

MIT
