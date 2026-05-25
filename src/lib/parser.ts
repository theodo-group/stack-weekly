import OpenAI from 'openai';
import { readOpenAiKey } from './env.js';
import type { RawNewsletter } from './newsletter.js';

export const PARSER_MODEL = 'gpt-4o';

export type Audience = 'react' | 'react-native' | 'node' | 'general';

export interface TaggedItem {
  section: string;
  sectionEmoji: string;
  itemEmoji: string;
  title: string;
  url: string;
  summary: string;
  tags: string[];
  related: string[];
  audience: Audience[];
}

export interface TaggedIssue {
  schemaVersion: 2;
  parsedAt: string;
  model: string;
  issueNumber: number;
  title: string;
  url: string;
  pubDate: string;
  intro: string;
  items: TaggedItem[];
}

const SYSTEM_PROMPT = `You parse one issue of the "This Week In React" newsletter into a structured, taggable index.

The downstream consumer is a developer who only wants items that will make them update or change their own repo. Be conservative — when in doubt, return tags = [].

For every input item, return one output object with:
- title: the article title (cleaned)
- url
- itemEmoji: keep the leading emoji from the raw text (e.g. 📦 for releases, 📜 for articles, 🎙️ for podcasts), or "" if none
- tags: array of exact npm package IDs (lowercase) — ONLY for items that are directly actionable for users of that package.

  TAG ONLY WHEN:
  (a) The item IS a release / version bump of that package (📦 emoji and a version number in the title).
      You MUST tag every 📦 release with the primary package being released. Derive the package ID by lowercasing the product name from the title and hyphen-joining words (e.g. "Rozenite DevTools 1.10 - …" → ["rozenite"]; "View Shot 5.1 - …" → ["react-native-view-shot"] if you know the scoped name, otherwise ["view-shot"]; "Skia Lab - Beautiful react-native-skia demo" → ["@shopify/react-native-skia"] because the demo's subject IS the skia package). When in doubt about scope (@org/name vs name), use the unscoped form.
  (b) The item is a security advisory or breaking-change announcement that REQUIRES users of that package to take action. Example: "Next.js May 2026 security release" → ["next"]; "TanStack npm supply-chain compromise" → ["@tanstack/react-query", "@tanstack/react-router", "@tanstack/start"].
  (c) The item is a tutorial / how-to whose entire subject is a specific non-obvious usage of that package's API (e.g. "Animating layouts with react-native-reanimated" → ["react-native-reanimated"]).
      IMPORTANT: if the title NAMES the package directly ("Untangling dialogs in React Router", "Forms with React Hook Form", "Querying with TanStack Query"), this rule applies — tag the named package. The package being in the title means a user of that package is the target audience.
  (d) The item is a comparison / performance / migration article that explicitly tells users of a specific package to change their approach. Tag every named package whose users would reconsider their code after reading. Example: "React Native Pressable faster than gesture handler" → ["react-native-gesture-handler", "react-native-reanimated"] (both are central: gesture-handler users learn they have a cheaper option, reanimated users learn its CSS transition API is the recommended path).

  DO NOT TAG WHEN:
  • The article merely mentions or uses the package as a vehicle for discussing a broader concept. Example: "React Server Components in TanStack" → tags = []. The article is about RSC architecture, not a TanStack Query API change.
  • The article is a news story, opinion piece, postmortem, or industry commentary that mentions a package by name. Example: "The Flight Protocol Made Your DoS My Problem" → tags = []. Reading it does not lead a normal user to update their repo.
  • The article is a marketing/PR piece from a vendor (e.g. "How Expo is optimizing for speed") — tags = [] unless it announces a concrete shipped change users must adopt.

  PRECISION RULES (apply on top of the WHEN/NOT clauses):
  • A release of "expo-speech-recognition" → tags = ["expo-speech-recognition"]. Never broaden to "expo".
  • A release of "expo-go" → tags = ["expo-go"]. Do NOT add "expo" — dev-build users don't care.
  • TanStack family: be specific — Query release → ["@tanstack/react-query"]; Router release → ["@tanstack/react-router"]; Start/RSC framework release → ["@tanstack/start"].
  • For a release whose notes BRAG about new support for X (e.g. "Storybook 10.4 — TanStack React, React Native isolation"), tag each explicitly-supported target with its actual package ID — e.g. ["storybook", "@tanstack/react-query"]. The principle: a release-notes integration shoutout = actionable for that ecosystem's users.
  • Generic news about "React 19", "React Compiler", "React Server Components" — tags = []. React core news is rarely actionable in a regular repo until a real upgrade lands.
  • Articles about Chrome, V8, npm-registry, bun, deno, TC39 → tags = []. These are not npm packages the user installs.
  • NEVER emit "react" or "react-native" as tags or related. They are too universal — every React/RN dev has them and using them as match keys generates pure noise. Drop them entirely; do not substitute. Same for vague catch-alls like "javascript" or "node".

- related: array of npm package IDs whose users would want to read this item even though the item is not directly about their package. Use this for:
  (1) ALTERNATIVES / COMPETITORS / COMPLEMENTS — new libraries that solve the same problem as an existing one.
      Example: "Redraw - 2D graphics primitives, powered by WebGPU" → related = ["@shopify/react-native-skia", "react-native-skia", "react-native-reanimated", "three"].
      Example: new state-management library → related = ["zustand", "jotai", "redux", "@reduxjs/toolkit"].
      Example: new form library → related = ["react-hook-form", "formik"].
  (2) TOPIC ARTICLES that don't name a specific package but discuss a concept implemented by a known set of packages. List the packages that IMPLEMENT or PROVIDE that concept.
      Example: "RSC Server Functions Are Not An API Boundary" (architectural article about RSC) → related = ["next", "@tanstack/start", "waku", "remix", "@redwoodjs/core"]. A user of any RSC-capable framework should read this.
      Example: "Animating Container Bounds" (animation patterns) → related = ["framer-motion", "motion", "react-spring", "react-native-reanimated"]. Animation-library users want this.
      Example: "Server-side state management" → related = ["@tanstack/react-query", "swr", "@apollo/client"].
  (3) DO NOT use related when:
      • the item already has direct tags covering it (a 📦 release of jotai 2.20 → related = []).
      • the article is generic ecosystem news, opinion, postmortem, or security commentary not tied to a specific topic — related = [].
      • the item is about a single package's internals (use the tags field instead).
  Be moderately generous: if a user of one of those packages would say "huh, worth reading" — list it. But do not pad with loosely-related packages.

Return JSON: { "items": TaggedItem[] }. Keep the order of input items. Output exactly one TaggedItem per input item.`;

export async function parseIssue(raw: RawNewsletter): Promise<TaggedIssue> {
  const apiKey = readOpenAiKey();
  const client = new OpenAI({ apiKey });

  // Send a compact representation of each item to keep the prompt cheap.
  const compactItems = raw.items.map((it, idx) => ({
    idx,
    section: it.section,
    itemEmoji: it.itemEmoji,
    title: it.title,
    url: it.url,
    text: it.rawText.slice(0, 400),
  }));

  const response = await client.chat.completions.create({
    model: PARSER_MODEL,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Issue #${raw.issueNumber}. ${raw.items.length} items to tag (YouTube already filtered out). Return one TaggedItem per input, preserving order.\n\n${JSON.stringify(compactItems, null, 2)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI.');

  const parsed = JSON.parse(content) as { items?: any[] };
  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error('Parser response missing items array.');
  }

  // Recombine with section/sectionEmoji from the raw items by index alignment.
  const items: TaggedItem[] = parsed.items.map((it, idx) => {
    const raw_i = raw.items[idx];
    return {
      section: raw_i?.section || it.section || '',
      sectionEmoji: raw_i?.sectionEmoji || '',
      itemEmoji: (it.itemEmoji || raw_i?.itemEmoji || '').trim(),
      title: cleanTitle(it.title || raw_i?.title || ''),
      url: it.url || raw_i?.url || '',
      summary: '',
      tags: normalizeTags(it.tags),
      related: normalizeTags(it.related),
      audience: [],
    };
  });

  return {
    schemaVersion: 2,
    parsedAt: new Date().toISOString(),
    model: PARSER_MODEL,
    issueNumber: raw.issueNumber,
    title: raw.title,
    url: raw.url,
    pubDate: raw.pubDate,
    intro: raw.intro,
    items,
  };
}

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const v of input) {
    if (typeof v !== 'string') continue;
    const s = v.trim().toLowerCase();
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

function cleanTitle(s: string): string {
  // strip a leading bullet emoji + space that some titles include
  return s.replace(/^[\p{Extended_Pictographic}‍️]+\s*/u, '').trim();
}
