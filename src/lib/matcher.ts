import type { TaggedItem } from './parser.js';
import type { StackContext } from './watchlist.js';

export type MatchReason =
  | { kind: 'package'; name: string; viaExtras: boolean }
  | { kind: 'related'; name: string };

export interface MatchedItem {
  item: TaggedItem;
  reasons: MatchReason[];
}

export interface SectionGroup {
  section: string;
  sectionEmoji: string;
  items: MatchedItem[];
}

export interface MatchResult {
  groups: SectionGroup[];
  totalMatched: number;
  totalScanned: number;
}

const UNIVERSAL_TAGS = new Set(['react', 'react-native']);

export function matchItems(items: TaggedItem[], ctx: StackContext): MatchResult {
  const matched: MatchedItem[] = [];

  for (const item of items) {
    const reasons: MatchReason[] = [];

    for (const tag of item.tags) {
      if (UNIVERSAL_TAGS.has(tag)) continue;
      if (ctx.packages.has(tag)) {
        reasons.push({ kind: 'package', name: tag, viaExtras: false });
      } else if (ctx.extras.includes(tag)) {
        reasons.push({ kind: 'package', name: tag, viaExtras: true });
      }
    }

    const directlyMatched = reasons.length > 0;
    if (!directlyMatched) {
      for (const rel of item.related || []) {
        if (UNIVERSAL_TAGS.has(rel)) continue;
        if (ctx.packages.has(rel) || ctx.extras.includes(rel)) {
          reasons.push({ kind: 'related', name: rel });
        }
      }
    }

    if (reasons.length > 0) matched.push({ item, reasons });
  }

  // Group by section, preserving the original feed order.
  const groupMap = new Map<string, SectionGroup>();
  for (const m of matched) {
    const key = m.item.section || 'Other';
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        section: stripEmoji(m.item.section),
        sectionEmoji: m.item.sectionEmoji || '•',
        items: [],
      });
    }
    groupMap.get(key)!.items.push(m);
  }

  return {
    groups: Array.from(groupMap.values()),
    totalMatched: matched.length,
    totalScanned: items.length,
  };
}

function stripEmoji(s: string): string {
  return s
    .replace(/^[\p{Extended_Pictographic}‍️]+\s*/u, '')
    .replace(/[​-‍﻿]/g, '')
    .trim();
}
