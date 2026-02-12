#!/usr/bin/env bash
set -Eeuo pipefail

# Creates an archive from a directory.
# Supports: .zip, .tar.gz, .tgz
#
# Requires GNU coreutils (readlink -m, xargs -r). Linux only.
#
# Usage: archive.sh <output_path> <source_dir>

archive_path="${1:?archive_path not set}"
archive_path="$(readlink -m "$archive_path")"
src_dir="${2:?src_dir not set}"
src_dir="$(readlink -m "$src_dir")"

# Work on a temp copy to avoid dirtying the source tree (e.g. git)
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir" "$temp_archive" 2>/dev/null' EXIT
cp -a "$src_dir/." "$work_dir/"

# ensure consistent file permissions; there shouldn't be any executables
find "$work_dir" -type f -print0 | xargs -0 -r chmod 644
find "$work_dir" -type d -print0 | xargs -0 -r chmod 755

echo >&2 "$archive_path"

# create the archive in a temp file first
temp_archive="$(mktemp)"
rm -f "$temp_archive"

pushd "$work_dir" >/dev/null

case "$archive_path" in
    *.tar.gz|*.tgz)
        tar -czf "$temp_archive" .
        ;;
    *.zip)
        zip -qr "$temp_archive" .
        ;;
    *)
        echo >&2 "Error: Unknown archive type: $archive_path"
        echo >&2 "Supported: .zip, .tar.gz, .tgz"
        exit 1
        ;;
esac

popd >/dev/null

# if source and destination are the same, remove the source directory
if [ "$archive_path" = "$src_dir" ]; then
    rm -rf "$src_dir"
fi

# move the temp archive to the final location
mv "$temp_archive" "$archive_path"
