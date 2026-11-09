#!/bin/sh
# Checkpoint ④: copy clean code into the submission repo (no dev history, no secrets), then key-scan it.
# Usage (from this repo): sh scripts/prepare-submission.sh ../df-2026-t074
#   git clone https://github.com/Devfest-Hackathon-2026/df-2026-t074 ../df-2026-t074   (first time)
set -eu
DEST="${1:?path to the cloned df-2026-t074 repo}"
[ -d "$DEST/.git" ] || { echo "$DEST is not a git repo. Clone df-2026-t074 first."; exit 1; }
SRC="$(cd "$(dirname "$0")/.." && pwd)"
rsync -a --delete \
  --exclude .git --exclude .env --exclude '.env.*' --include .env.example \
  --exclude node_modules --exclude dist --exclude build --exclude test-results --exclude playwright-report \
  --exclude .github/workflows/deploy.yml \
  "$SRC"/ "$DEST"/
cp "$SRC/.env.example" "$DEST/.env.example"
cd "$DEST"
git add -A
echo "--- git status (must NOT list .env) ---"
git status --short | head -50
FAIL=0
git ls-files | grep -i -E "\.env$|service.?account|credentials|\.pem$" && FAIL=1
git grep -n -I -E "AIza[0-9A-Za-z_-]{30,}|BEGIN PRIVATE KEY|private_key\"|client_secret\"" -- . ':!scripts/keyscan.sh' && FAIL=1
[ "$FAIL" = 0 ] && echo "Key scan clean. Review, then: git commit -m 'Jeri: final submission' && git push" || { echo "KEY SCAN FAILED – do not push"; exit 1; }
