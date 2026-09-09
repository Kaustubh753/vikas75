/**
 * The room's Pusher channel name — the ONE definition, imported by both halves.
 *
 * It lived in `lib/pusher.ts` (server) and `lib/pusher-client.ts` (browser) as two identical
 * copies, which is exactly how bug #13 happened: the client uppercased the code and the server
 * did not, so a mixed-case room silently published to a channel nobody was listening on. The
 * copies agree again today; keeping them apart just leaves the trap re-armed. This file has no
 * imports of its own precisely so the server module and the browser bundle can both take it.
 */
export function getRoomChannel(code: string): string {
  // private- prefix triggers Pusher channel authorisation via /api/pusher/auth.
  return `private-game-${code.toUpperCase()}`;
}
