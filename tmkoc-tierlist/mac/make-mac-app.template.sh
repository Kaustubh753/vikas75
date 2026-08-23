#!/bin/bash
# ── Taarak Tier List: Mac app + DMG builder ─────────────────────────────
# Double-click this file (or run: bash Make-Mac-App.command) on your Mac.
# It builds "Taarak Tier List.app" into /Applications and also leaves a
# proper Taarak-Tier-List.dmg on your Desktop. Everything is built locally
# with Apple's own tools, so the app opens without any Gatekeeper drama.
set -euo pipefail

APP_NAME="Taarak Tier List"
APP_URL="__APP_URL__"
BUNDLE_ID="net.lexmantra.taarak-tier-list"

WORK="$(mktemp -d /tmp/taarak-app.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT
APP="$WORK/$APP_NAME.app"

echo "🕶  Building $APP_NAME…"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# ── Launcher: opens the tier list. Chrome/Edge/Brave get a clean app
#    window (--app mode); otherwise the default browser opens it. ──
cat > "$APP/Contents/MacOS/launcher" <<LAUNCH
#!/bin/bash
URL="$APP_URL"
for B in "Google Chrome" "Microsoft Edge" "Brave Browser" "Chromium"; do
  if [ -d "/Applications/\$B.app" ]; then
    exec open -na "\$B" --args --app="\$URL"
  fi
done
exec open "\$URL"
LAUNCH
chmod +x "$APP/Contents/MacOS/launcher"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>$APP_NAME</string>
  <key>CFBundleDisplayName</key><string>$APP_NAME</string>
  <key>CFBundleIdentifier</key><string>$BUNDLE_ID</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>launcher</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST

# ── App icon (embedded below as base64) ──
ICON_PNG="$WORK/icon-1024.png"
base64 -D -o "$ICON_PNG" <<'ICON_B64'
__ICON_BASE64__
ICON_B64

ICONSET="$WORK/AppIcon.iconset"
mkdir -p "$ICONSET"
for SZ in 16 32 128 256 512; do
  sips -z $SZ $SZ "$ICON_PNG" --out "$ICONSET/icon_${SZ}x${SZ}.png" >/dev/null
  DBL=$((SZ * 2))
  sips -z $DBL $DBL "$ICON_PNG" --out "$ICONSET/icon_${SZ}x${SZ}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"

# ── Install into /Applications (falls back to ~/Applications) ──
DEST="/Applications"
if ! cp -R "$APP" "$DEST/" 2>/dev/null; then
  DEST="$HOME/Applications"
  mkdir -p "$DEST"
  rm -rf "$DEST/$APP_NAME.app"
  cp -R "$APP" "$DEST/"
fi
echo "✅ Installed: $DEST/$APP_NAME.app"

# ── Real DMG via hdiutil ──
DMG_STAGE="$WORK/dmg"
mkdir -p "$DMG_STAGE"
cp -R "$APP" "$DMG_STAGE/"
ln -s /Applications "$DMG_STAGE/Applications"
DMG_OUT="$HOME/Desktop/Taarak-Tier-List.dmg"
rm -f "$DMG_OUT"
hdiutil create -volname "$APP_NAME" -srcfolder "$DMG_STAGE" -format UDZO -ov "$DMG_OUT" >/dev/null
echo "✅ Disk image: $DMG_OUT"

open -R "$DMG_OUT" || true
echo
echo "Ho gaya! '$APP_NAME' ab Launchpad/Applications me hai — kholte hi"
echo "tumhara tier list board khul jayega. DMG Desktop pe rakh diya hai,"
echo "kisi aur Mac pe le jaane ke liye."
read -n 1 -s -r -p "Press any key to close…" || true
