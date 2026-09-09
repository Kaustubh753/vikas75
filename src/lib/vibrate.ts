/**
 * Wrapper around the Vibration API.
 * Silently no-ops on browsers/devices that don't support it.
 */
export function vibrate(pattern: number | number[]): void {
  try {
    // `vibrate` is in lib.dom, so no cast is needed to reach it — but it is declared
    // non-optional there while iOS Safari genuinely doesn't implement it, hence the `?.`.
    navigator.vibrate?.(pattern);
  } catch {
    // Ignore — vibration is best-effort
  }
}
