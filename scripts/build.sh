#!/usr/bin/env bash
set -Eeuo pipefail

# Build a Zola site with archive directory processing.
# Converts directories named *.zip, *.tar.gz, *.tgz into actual archives.
#
# Usage: build.sh [output_dir]
#   output_dir: Build output directory (default: public)

script_dir="$(cd "$(dirname "$0")" && pwd)"
site_root="$(cd "$script_dir/../../.." && pwd)"
cd "$site_root"

build_dir="${1:-public}"

# Build the site with Zola first
echo >&2 "Building site with Zola..."
zola build -o "$build_dir" --force

# Build archives from content/ directories.  Zola copies asset files that
# sit next to _index.md, but it does NOT know how to turn a directory named
# e.g. "project.zip/" into an actual zip archive.  We do that here.
echo >&2 "Processing archive directories in content/..."
find content -type d \( -name '*.zip' -o -name '*.tar.gz' -o -name '*.tgz' \) | while read -r srcdir; do
    relpath="${srcdir#content/}"
    dest="$build_dir/$relpath"
    mkdir -p "$(dirname "$dest")"
    "$script_dir/archive.sh" "$dest" "$srcdir" || { echo >&2 "Error: failed to create archive for $srcdir"; exit 1; }
done

echo >&2 "Build complete: $build_dir/"
