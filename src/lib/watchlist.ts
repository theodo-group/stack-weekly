import fs from 'node:fs';
import path from 'node:path';

export interface StackContext {
  repoName: string;
  packages: Set<string>;       // exact npm IDs the user has installed
  extras: string[];            // extra package IDs the user opted-in to track
  hasReact: boolean;
  hasReactNative: boolean;
  hasNode: boolean;
  sources: { packageJson?: string; extras?: string };
}

const EXTRAS_FILENAME = '.stack-weekly-extras.json';

export function readStackContext(directory: string): StackContext | null {
  const ctx: StackContext = {
    repoName: path.basename(path.resolve(directory)),
    packages: new Set(),
    extras: [],
    hasReact: false,
    hasReactNative: false,
    hasNode: true, // anyone running this tool has node
    sources: {},
  };

  // package.json (walk up a few levels if not in cwd)
  const pkgPath = findUp(directory, 'package.json', 5);
  if (pkgPath) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      ctx.repoName = pkg.name || ctx.repoName;
      const deps: Record<string, string> = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
        ...(pkg.peerDependencies || {}),
      };
      for (const name of Object.keys(deps)) {
        ctx.packages.add(name.toLowerCase());
      }
      ctx.hasReact = ctx.packages.has('react');
      ctx.hasReactNative = ctx.packages.has('react-native');
      ctx.sources.packageJson = pkgPath;
    } catch {
      /* ignore */
    }
  }

  // optional extras watchlist (legacy .twir-extras.json also accepted)
  const extrasPath =
    findUp(directory, EXTRAS_FILENAME, 5) || findUp(directory, '.twir-extras.json', 5);
  if (extrasPath) {
    try {
      const raw = JSON.parse(fs.readFileSync(extrasPath, 'utf8'));
      const list: unknown = Array.isArray(raw) ? raw : raw?.packages;
      if (Array.isArray(list)) {
        for (const item of list) {
          if (typeof item === 'string') {
            const s = item.trim().toLowerCase();
            if (s) ctx.extras.push(s);
          }
        }
      }
      ctx.sources.extras = extrasPath;
    } catch {
      /* ignore */
    }
  }

  if (!ctx.sources.packageJson && ctx.extras.length === 0) return null;
  return ctx;
}

function findUp(start: string, filename: string, maxLevels: number): string | null {
  let dir = path.resolve(start);
  const root = path.parse(dir).root;
  for (let i = 0; i < maxLevels && dir !== root; i++) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return null;
}
