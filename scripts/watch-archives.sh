#!/usr/bin/env bash
set -Eeuo pipefail

# Watch for changes in content archive directories and rebuild.
# Requires inotify-tools: sudo apt install inotify-tools
#
# Usage: watch-archives.sh

script_dir="$(cd "$(dirname "$0")" && pwd)"
site_root="$(cd "$script_dir/../../.." && pwd)"
cd "$site_root"

if ! command -v inotifywait >/dev/null 2>&1; then
    echo >&2 "Error: inotifywait not found. Install with: sudo apt install inotify-tools"
    exit 1
fi

# Initial build
"$script_dir/archives.sh"

echo >&2 "Watching content/**/*.{zip,tar.gz,tgz}/ directories for changes..."
echo >&2 "Press Ctrl+C to stop"

while true; do
    inotifywait -q -r -e modify,create,delete,move content --include '\.(zip|tar\.gz|tgz)/' 2>/dev/null
    echo >&2 "Change detected, rebuilding archives..."
    "$script_dir/archives.sh"
done
