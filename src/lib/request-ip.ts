import type { NextRequest } from 'next/server';

/** Client IP for rate-limit keys. `x-real-ip` is set by Vercel's edge and can't be client-spoofed;
 *  fall back to the LAST (CDN-appended) value of `x-forwarded-for`, never the first — the first is
 *  client-controlled and trivially spoofable. Single source so the anti-spoof rule can't drift. */
export function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown'
  );
}
