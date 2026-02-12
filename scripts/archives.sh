#!/usr/bin/env bash
set -Eeuo pipefail

# Pre-build archives from directory trees into real archive files.
# Sources live in content/ co-located with their pages.
# Generated files go into static/ so Zola can serve them during development.
#
# Usage: archives.sh

script_dir="$(cd "$(dirname "$0")" && pwd)"
site_root="$(cd "$script_dir/../../.." && pwd)"
cd "$site_root"

echo >&2 "Creating archives in static/ for development..."

find content -type d \( -name '*.zip' -o -name '*.tar.gz' -o -name '*.tgz' \) | while read -r srcdir; do
    relpath="${srcdir#content/}"
    dest="static/$relpath"
    mkdir -p "$(dirname "$dest")"
    "$script_dir/archive.sh" "$dest" "$srcdir" || { echo >&2 "Error: failed to create archive for $srcdir"; exit 1; }
done
