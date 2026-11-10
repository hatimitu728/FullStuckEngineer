#!/bin/sh
# Copy clean code into the official submission repo (no dev history, no secrets), then key-scan it.
# Usage (from this repo): sh scripts/prepare-submission.sh ../df-2026-t074
#   first: git clone https://github.com/Devfest-Hackathon-2026/df-2026-t074 ../df-2026-t074
# Keeps the organizers' LICENSE, merges their .gitignore with ours, and leaves out .github/
# (GitHub Actions are disabled in the submission repo, and workflow files need a special token scope to push).
set -eu
DEST="${1:?path to the cloned df-2026-t074 repo}"
[ -d "$DEST/.git" ] || { echo "$DEST is not a git repo. Clone df-2026-t074 first."; exit 1; }
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$(cd "$DEST" && pwd)"
TMP="$(mktemp -d)"
[ -f "$DEST/LICENSE" ] && cp "$DEST/LICENSE" "$TMP/LICENSE"
[ -f "$DEST/.gitignore" ] && cp "$DEST/.gitignore" "$TMP/gitignore"
# Copy only files tracked by git (so .env and other untracked files can never be copied).
find "$DEST" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
(cd "$SRC" && git ls-files -z | grep -zv -e '^\.github/' -e '^docs/media/' | xargs -0 tar cf -) | (cd "$DEST" && tar xf -)
[ -f "$TMP/LICENSE" ] && cp "$TMP/LICENSE" "$DEST/LICENSE"
if [ -f "$TMP/gitignore" ]; then
  { cat "$TMP/gitignore"; echo ""; echo "# --- Jeri ---"; grep -vxF -f "$TMP/gitignore" "$SRC/.gitignore" || true; } > "$DEST/.gitignore"
fi
rm -rf "$TMP"
cd "$DEST"
git add -A
echo "--- files staged: $(git diff --cached --name-only | wc -l) (must NOT include .env) ---"
FAIL=0
git ls-files | grep -i -E "(^|/)\.env$|\.dev\.vars$|service.?account|credentials|\.pem$" && FAIL=1
git grep -n -I -E "AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_-]{20,}|cfut_[0-9A-Za-z]{20,}|BEGIN PRIVATE KEY|private_key\"|client_secret\"" -- . ':!scripts/keyscan.sh' ':!scripts/prepare-submission.sh' && FAIL=1
[ "$FAIL" = 0 ] && echo "Key scan clean. Next: git commit -m 'Jeri: final submission' && git push" || { echo "KEY SCAN FAILED – do not push"; exit 1; }
