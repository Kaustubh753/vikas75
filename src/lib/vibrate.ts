/**
 * Wrapper around the Vibration API.
 * Silently no-ops on browsers/devices that don't support it.
 */
export function vibrate(pattern: number | number[]): void {
  try {
    (navigator as Navigator & { vibrate?: (p: number | number[]) => void }).vibrate?.(pattern);
  } catch {
    // Ignore — vibration is best-effort
  }
}
