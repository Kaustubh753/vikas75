#!/usr/bin/env bash
# Builds two things from app.html (the artifact source):
#   index.html            — plain standalone file (open from disk anywhere)
#   ../public/tierlist/   — installable PWA build served by the Next.js site at /tierlist
set -euo pipefail
cd "$(dirname "$0")"

# 1. Plain standalone
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n'
  printf '<meta name="viewport" content="width=device-width, initial-scale=1" />\n'
  printf '</head>\n<body>\n'
  cat app.html
  printf '\n</body>\n</html>\n'
} > index.html
echo "built index.html ($(wc -c < index.html) bytes)"

# 2. PWA build (manifest, icons, standalone-mode meta, service worker)
mkdir -p ../public/tierlist
{
  printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n'
  printf '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n'
  printf '<title>Taarak Tier List</title>\n'
  printf '<link rel="manifest" href="manifest.webmanifest" />\n'
  printf '<link rel="icon" href="icon-192.png" sizes="192x192" type="image/png" />\n'
  printf '<link rel="apple-touch-icon" href="apple-touch-icon.png" />\n'
  printf '<meta name="mobile-web-app-capable" content="yes" />\n'
  printf '<meta name="apple-mobile-web-app-capable" content="yes" />\n'
  printf '<meta name="apple-mobile-web-app-status-bar-style" content="default" />\n'
  printf '<meta name="apple-mobile-web-app-title" content="Taarak Tiers" />\n'
  printf '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#F7EFDE" />\n'
  printf '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#101A26" />\n'
  printf '</head>\n<body>\n'
  cat app.html
  printf '\n<script>\n'
  printf 'if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {\n'
  printf '  window.addEventListener("load", function () {\n'
  printf '    navigator.serviceWorker.register("sw.js").catch(function () {});\n'
  printf '  });\n'
  printf '}\n'
  printf '</script>\n</body>\n</html>\n'
} > ../public/tierlist/index.html
echo "built ../public/tierlist/index.html ($(wc -c < ../public/tierlist/index.html) bytes)"
