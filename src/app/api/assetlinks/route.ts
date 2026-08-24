import { NextResponse } from 'next/server';

// Digital Asset Links for the Android TWA (Trusted Web Activity) wrapper — see apk/README.md.
// Served at https://<host>/.well-known/assetlinks.json via the rewrite in next.config.ts. When it
// lists the SHA-256 fingerprint of the key that signed the APK, Android verifies the link and
// launches the TWA with NO browser URL bar. Until it's configured the array is empty (still valid
// JSON) and the app runs fine — the TWA just falls back to a Custom Tab that briefly shows the URL.
//
// Configure on the deploy host (e.g. Vercel project env):
//   TWA_PACKAGE_NAME              — e.g. com.sujeetkofficial.vikas75 (must match apk/twa-manifest.json)
//   TWA_SHA256_CERT_FINGERPRINTS  — comma-separated AA:BB:.. fingerprints: the APK signing key's,
//                                   plus (if using Play App Signing) the one Play Console shows.
// Read at request time so rotating a fingerprint needs no code redeploy.
export const dynamic = 'force-dynamic';

const DEFAULT_PACKAGE = 'com.sujeetkofficial.vikas75';

export function GET() {
  const packageName = process.env.TWA_PACKAGE_NAME?.trim() || DEFAULT_PACKAGE;
  const fingerprints = (process.env.TWA_SHA256_CERT_FINGERPRINTS ?? '')
    .split(',')
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);

  const statements = fingerprints.length
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: packageName,
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : [];

  return NextResponse.json(statements, {
    // Google requires application/json (NextResponse.json sets it); a short cache is safe since
    // fingerprints change rarely and the route is force-dynamic so it always reflects current env.
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}
