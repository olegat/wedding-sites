#!/usr/bin/env bash
set -e

# Usage: ./minify-all.sh <input_file> <output_file>

INPUT="$1"
OUTPUT="$2"

if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
  echo "Usage: $0 <input_file> <output_file>" 1>&2
  exit 1
fi

EXT="${INPUT##*.}"
FILENAME="$(basename "$INPUT")"

case "$EXT" in
  html)
    npx html-minifier-terser \
      --collapse-whitespace \
      --remove-comments \
      --minify-css true \
      --minify-js true \
      "$INPUT" -o "$OUTPUT"
    ;;
  js)
    npx terser "$INPUT" -c -m -o "$OUTPUT"
    ;;
  css)
    npx cleancss -o "$OUTPUT" "$INPUT"
    ;;
  *)
    echo "Unsupported file type: $EXT" 1>&2
    exit 1
    ;;
esac
