#!/bin/sh
# Run before every push. Both checks must print nothing.
git ls-files | grep -i -E "\.env$|service.?account|credentials|\.pem$" && { echo "KEY SCAN FAILED: secret-looking file tracked"; exit 1; }
git grep -n -I -E "AIza[0-9A-Za-z_-]{30,}|AQ\.[0-9A-Za-z_-]{20,}|BEGIN PRIVATE KEY|private_key\"|client_secret\"" -- . ':!scripts/keyscan.sh' ':!scripts/prepare-submission.sh' && { echo "KEY SCAN FAILED: key-like string in tracked files"; exit 1; }
echo "Key scan clean."
