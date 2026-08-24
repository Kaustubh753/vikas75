# Vikas 75 — Android app (TWA wrapper)

This folder wraps the deployed Vikas 75 web app as an installable Android app using a
**Trusted Web Activity (TWA)** — Google's recommended way to ship a PWA to the Play Store.

**Why a TWA and not a bundled app?** Vikas 75 is a server-rendered app (live game API, Pusher
real-time, the AI judge). It can't be frozen into an APK — it has to talk to the running server.
A TWA is a thin native shell that opens the deployed site full-screen in the device's own Chrome
engine, so everything works exactly as it does in the browser (Pusher WebSockets, Web Audio sound,
vibration, local storage), the APK stays tiny, and the app updates the instant you deploy the
site — no new APK needed for content or gameplay changes.

`twa-manifest.json` in this folder is the single source of truth for the build (package name,
colours, icons, orientation, version). It's already filled in for Vikas 75.

---

## Before you build — one thing to check

The site must be **deployed over HTTPS** and `twa-manifest.json`'s `"host"` must point at that
domain. It currently points at `vikas75.vercel.app`. If you use a custom domain, change `host`,
`startUrl`'s origin, `iconUrl`, `maskableIconUrl`, and `webManifestUrl` to it first. The build
downloads the app icons from the live site, so the domain has to be reachable.

---

## Option A — PWABuilder (easiest, no tools to install)

Best if you just want an APK without setting up Android tooling.

1. Go to **https://www.pwabuilder.com** and enter your deployed URL.
2. Choose **Android → Generate Package**. Accept the defaults, or match `twa-manifest.json`
   (package id `com.sujeetkofficial.vikas75`, portrait, theme `#08070f`).
3. Download the zip. It contains the **signed APK/AAB**, the **signing key** (`signing.keystore`
   — keep it safe, see *Signing* below), and an **`assetlinks.json`** with your key's fingerprint.
4. Copy the `sha256_cert_fingerprints` value from that `assetlinks.json` and set it on your host
   as `TWA_SHA256_CERT_FINGERPRINTS` (see *Digital Asset Links* below).
5. Install the APK on a phone (`adb install app-release-signed.apk`) or upload the `.aab` to Play.

---

## Option B — GitHub Actions (reproducible, no local tools)

The workflow at `.github/workflows/android-apk.yml` builds and signs the APK on a runner.

1. Create a release keystore once (keep it forever — see *Signing*):
   ```bash
   keytool -genkeypair -v -keystore android.keystore -alias vikas75 \
     -keyalg RSA -keysize 2048 -validity 3650
   ```
2. Add these repo secrets (Settings → Secrets and variables → Actions) — set **all three**, or
   none (the job then builds with a throwaway key):
   - `ANDROID_KEYSTORE_BASE64` — `base64 -w0 android.keystore`
   - `ANDROID_KEYSTORE_PASSWORD` — the store password you chose
   - `ANDROID_KEY_PASSWORD` — the key password you chose

   The keystore's key alias must be `vikas75`. If yours differs, add a repo **variable**
   `ANDROID_KEY_ALIAS` with your alias — the workflow syncs `twa-manifest.json` to it.
3. Run **Actions → Build Android APK (TWA) → Run workflow** (or push a tag like `apk-v1.0.0`).
4. Download the `vikas75-android` artifact, and copy the **SHA-256** the "fingerprint" step prints
   into `TWA_SHA256_CERT_FINGERPRINTS` on your host.

Without the secrets the job still runs with a throwaway key so you get a testable APK — but that
key won't match your assetlinks, so that build shows a URL bar. Use real secrets for release.

---

## Option C — Bubblewrap locally (for developers)

Needs JDK 17 and the Android SDK. Bubblewrap can install its own on first run.

```bash
npm install -g @bubblewrap/cli
cd apk
# `build` only compiles an existing project, so generate it from twa-manifest.json first:
bubblewrap update
bubblewrap build --skipPwaValidation
```

The signed `app-release-signed.apk` and `app-release-bundle.aab` land in this folder. Run
`bubblewrap install` to push the APK to a connected device.

If `bubblewrap update` says there's no project to update on your CLI version, scaffold it once
with `bubblewrap init --manifest https://<your-host>/manifest.webmanifest` (interactive — the
prompts default to your manifest values), then `bubblewrap build --skipPwaValidation`.

---

## Signing (read this once)

The keystore is **permanent**. Once an app is on the Play Store, every update must be signed with
the same key (or Play App Signing's key). **Lose it and you can't update your own app.** Keep
`android.keystore` and its passwords somewhere safe and backed up. It is git-ignored here on
purpose — never commit it.

---

## Digital Asset Links (removes the URL bar)

A TWA shows a thin browser URL bar until Android can prove the app and the site belong together.
That proof is a file at `https://<your-host>/.well-known/assetlinks.json` listing the SHA-256
fingerprint of the key that signed the APK.

This repo serves that file already — from the env-driven route `src/app/api/assetlinks/route.ts`
via a rewrite in `next.config.ts`. You just set two environment variables on your deploy host:

| Variable | Value |
|---|---|
| `TWA_PACKAGE_NAME` | `com.sujeetkofficial.vikas75` (must match `twa-manifest.json`) |
| `TWA_SHA256_CERT_FINGERPRINTS` | the `AA:BB:...` SHA-256 from your build (comma-separate multiple) |

Then verify: open `https://<your-host>/.well-known/assetlinks.json` — it should list your
fingerprint. Reinstall the APK; the URL bar should be gone.

**Using Play App Signing?** Google re-signs your app with its own key. Add the SHA-256 that Play
Console shows (Setup → App integrity) to `TWA_SHA256_CERT_FINGERPRINTS` as well — you can list
both your upload key's fingerprint and Google's.

---

## Updating

- **Content, screens, gameplay, fixes:** just deploy the site. The installed app shows the new
  version on next launch — no rebuild.
- **App identity (icon, name, colours, orientation) or a Play Store release:** bump
  `appVersionCode` (and `appVersionName`/`appVersion`) in `twa-manifest.json`, rebuild, and upload
  the new `.aab`. `appVersionCode` must increase for every Play upload.

---

## Alternative: Capacitor

If you'd rather ship a raw WebView shell (no assetlinks step, more room for native plugins like a
custom splash), Capacitor pointed at the deployed URL also works:
`npm i @capacitor/core @capacitor/android && npx cap init && npx cap add android`, set
`server.url` to your site in `capacitor.config.ts`, then build in Android Studio. The TWA route
above is preferred for this app because it uses the real Chrome engine and is Play-Store-optimal.
