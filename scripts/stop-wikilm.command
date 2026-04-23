#!/bin/bash
# Double-click-to-stop WikiLM.
#
# Kills whatever's listening on :3000 (the Next.js dev server the launcher
# started). Safe to run when nothing's listening — just reports "nothing to
# stop" and exits. Pair with launch-wikilm.command on the Dock: launch on
# the left, stop on the right.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$REPO_ROOT/backups/.wikilm-dev.log"
PORT=3000

PIDS=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)

if [ -z "$PIDS" ]; then
  echo "Nothing listening on :$PORT — WikiLM isn't running."
  echo "You can close this window."
  exit 0
fi

echo "Stopping WikiLM (PIDs: $PIDS)…"
# Try graceful first, then hard if the process lingers past 3 seconds.
kill $PIDS 2>/dev/null || true
for i in 1 2 3; do
  sleep 1
  STILL=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
  [ -z "$STILL" ] && break
done

STILL=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
if [ -n "$STILL" ]; then
  echo "Graceful stop didn't catch — forcing…"
  kill -9 $STILL 2>/dev/null || true
fi

STILL=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
if [ -z "$STILL" ]; then
  echo "Stopped. WikiLM is no longer running."
  if [ -f "$LOG_FILE" ]; then
    echo "(log preserved at $LOG_FILE)"
  fi
else
  echo "Couldn't stop the server — still holding :$PORT. Try Activity Monitor."
  exit 1
fi
