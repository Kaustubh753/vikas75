#!/usr/bin/env bash
# Wraps app.html (artifact source) into a full standalone HTML document.
set -euo pipefail
cd "$(dirname "$0")"
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n'
  printf '</head>\n<body>\n'
  cat app.html
  printf '\n</body>\n</html>\n'
} > index.html
echo "built index.html ($(wc -c < index.html) bytes)"
