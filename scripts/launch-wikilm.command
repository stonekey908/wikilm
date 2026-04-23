#!/bin/bash
# Double-click-to-launch WikiLM.
#
# Starts the Next.js dev server if it isn't already running, then opens
# http://localhost:3000 in the default browser. Designed to live on the
# Dock / Desktop — no terminal interaction required.
#
# First use:
#   1. Right-click this file → Open (macOS will ask for permission once).
#   2. Gets added to "opened with" quarantine exceptions, subsequent
#      launches are single-click.
#
# The server stays running after the script exits so the app keeps
# working across browser restarts. Quit it from the Dispatch page's
# server-status widget, or kill the process on port 3000 manually.

set -e

# Resolve the repo root relative to this script regardless of cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
APP_DIR="$REPO_ROOT/app"
URL="http://localhost:3000"
LOG_FILE="$REPO_ROOT/backups/.wikilm-dev.log"

# If the user has installed the PWA (Chrome / Edge / Arc: "Install app",
# Safari: File → Add to Dock) we'll open that standalone window instead of
# a regular browser tab — matches the Dock-app experience exactly. Searched
# by display name across the two Application folders macOS writes PWAs to.
PWA_CANDIDATES=(
  "$HOME/Applications/Chrome Apps.localized/WikiLM — Editorial.app"
  "$HOME/Applications/Chrome Apps.localized/WikiLM.app"
  "$HOME/Applications/WikiLM — Editorial.app"
  "$HOME/Applications/WikiLM.app"
  "/Applications/WikiLM — Editorial.app"
  "/Applications/WikiLM.app"
)
PWA_APP=""
for candidate in "${PWA_CANDIDATES[@]}"; do
  if [ -d "$candidate" ]; then
    PWA_APP="$candidate"
    break
  fi
done

open_app() {
  if [ -n "$PWA_APP" ]; then
    echo "Opening PWA window: $PWA_APP"
    open -a "$PWA_APP"
  else
    echo "No PWA install found — opening in default browser."
    echo "(Install as an app from Chrome → ⋯ → Install WikiLM for a standalone window.)"
    open "$URL"
  fi
}

mkdir -p "$(dirname "$LOG_FILE")"

if [ ! -d "$APP_DIR/node_modules" ]; then
  echo "First-run — installing dependencies…"
  cd "$APP_DIR"
  npm install
fi

# Already running? Just open the PWA / browser.
if curl -s -o /dev/null -m 2 "$URL"; then
  echo "Server already running."
  open_app
  exit 0
fi

echo "Booting WikiLM dev server… (log: $LOG_FILE)"
cd "$APP_DIR"

# Launch detached so the Terminal window can close without killing the server.
nohup npm run dev > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Poll the server until it responds, then open the PWA / browser.
echo -n "Waiting for server to come up"
for i in $(seq 1 45); do
  if curl -s -o /dev/null -m 1 "$URL"; then
    echo ""
    echo "Ready."
    open_app
    exit 0
  fi
  echo -n "."
  sleep 1
done

echo ""
echo "Server didn't respond within 45s — check the log at:"
echo "  $LOG_FILE"
exit 1
