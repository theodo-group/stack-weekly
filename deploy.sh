#!/bin/bash

# Deploy script: bumps version, commits, pushes, and publishes to npm
# Usage: ./deploy.sh [patch|minor|major]
# Default: patch

set -e  # Exit on error

VERSION_TYPE=${1:-patch}

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Error: Version type must be 'patch', 'minor', or 'major'"
  echo "Usage: ./deploy.sh [patch|minor|major]"
  exit 1
fi

echo "🚀 Starting deployment process..."
echo "📦 Version bump type: $VERSION_TYPE"

# Stage and commit any pending changes (except the version bump itself)
if ! git diff --quiet --exit-code || ! git diff --cached --quiet --exit-code; then
  echo "📝 Staging all changes..."
  git add -A

  echo "💾 Committing changes..."
  git commit -m "chore: prepare for release" || echo "No changes to commit"
fi

# Bump version (without git tag — we do that explicitly below)
echo "⬆️  Bumping version ($VERSION_TYPE)..."
npm version "$VERSION_TYPE" --no-git-tag-version

# Commit version bump
NEW_VERSION=$(node -p "require('./package.json').version")
echo "💾 Committing version bump..."
git add package.json package-lock.json 2>/dev/null || git add package.json
git commit -m "chore: bump version to $NEW_VERSION"

# Tag
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Push commits and tags
echo "📤 Pushing to git..."
git push
git push --tags

# Publish to npm (prepublishOnly will build first)
echo "📦 Publishing to npm..."
npm publish

echo "✅ Deployment complete! Version $NEW_VERSION has been published."
echo "   bunx @bam.tech/stack-weekly"
