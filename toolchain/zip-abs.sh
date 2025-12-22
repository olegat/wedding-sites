#!/usr/bin/env bash
set -e

# Usage: ./zip-abs.sh <out> <indir> <in...>

out="$1"
indir="$2"
shift 2
in=("$@")

if [ -z "$out" ] || [ -z "$indir" ] || [ ${#in[@]} -eq 0 ]; then
  echo "Usage: $0 <out> <indir> <in...>" 1>&2
  exit 1
fi

# Change to the base directory
pushd "$indir" > /dev/null

# Prepare relative paths
relative_paths=()
for f in "${in[@]}"; do
    relative_paths+=("$(basename "$f")")
done

# Zip the files with relative paths
rm "$out"
zip -r "$out" "${relative_paths[@]}"

popd > /dev/null
