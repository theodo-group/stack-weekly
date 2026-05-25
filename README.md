# stack-weekly

A weekly digest of [**This Week In React**](https://thisweekinreact.com/), filtered against your project's `package.json`. Surfaces only items that are actually relevant to your stack.

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

## Use

From any project root (anywhere with a `package.json`):

```bash
bunx github:theodo-group/stack-weekly
# or
npx github:theodo-group/stack-weekly
```

Or pin it as a `package.json` script so you can `npm run news` weekly:

```json
{
  "scripts": {
    "news": "npx --yes github:theodo-group/stack-weekly"
  }
}
```

Or run it after every `npm install` as a postinstall hook:

```json
{
  "scripts": {
    "postinstall": "npx --yes github:theodo-group/stack-weekly || true"
  }
}
```

(The `|| true` makes sure a transient fetch failure never breaks `npm install`.)

### Flags

```bash
stack-weekly                  # last 2 weeks (default)
stack-weekly --weeks 4        # last 4 weeks
stack-weekly --issue 282      # specific issue
stack-weekly --directory ../some-other-project
```

### Tracking packages you don't yet have

Drop a `.stack-weekly-extras.json` in your project root listing packages you want to follow (libraries you're evaluating, devtools your team uses but aren't in `package.json` yet):

```json
["rozenite", "@shopify/react-native-skia"]
```

They show up with `☆` instead of `★`.

## Match glyphs

| Glyph | Meaning |
| ----- | ------- |
| `★ pkg` | Direct dependency match |
| `☆ pkg` | Match from your `.stack-weekly-extras.json` |
| `◇ pkg` | Item is an alternative/competitor/complement to a package you have (only fires when no direct hit exists) |
| `⭐` (item) | Featured "headline" item of a section in the newsletter |

## Tuning matches

If a match looks wrong, fix the GPT system prompt at `src/lib/parser.ts`, delete the affected `index/issue-NNN.json`, then re-run the workflow:

```bash
gh workflow run update-index -R theodo-group/stack-weekly
```

The prompt's core rule: **tag a package only if reading the item would make a user of that package update their repo or reconsider their code**. Bare `"react"` and `"react-native"` are never tagged (too universal).

## How it works

1. A **GitHub Action** runs every Friday 07:00 UTC. It fetches the latest issues from the newsletter's RSS feed, sends each one to GPT-4o **once**, and commits the result as `index/issue-NNN.json` to this repo.
2. The **CLI** does no LLM work. On each run it reads your `package.json`, fetches the last 2 indexed issues from `raw.githubusercontent.com`, and matches package names locally. Cached in `~/.cache/stack-weekly/`.

So GPT parsing happens once per issue and is shared across all users. The CLI itself is free, fast, and offline-friendly after the first fetch.

## License

MIT
