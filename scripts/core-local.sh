#!/bin/sh
# Start the real server (no stub) on :8080 and run the CORE gate + accessibility check against it.
set -u
PORT=8080 NODE_USE_ENV_PROXY=1 node --env-file-if-exists=.env server/index.js > /tmp/jeri-server.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null' EXIT
sleep 1.5
node scripts/core-gate.js http://localhost:8080/; CORE=$?
node scripts/a11y-check.js http://localhost:8080/; A11Y=$?
echo "server log: /tmp/jeri-server.log"
exit $((CORE + A11Y))
