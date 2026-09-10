'use client';
import { useState, useEffect } from 'react';

/**
 * Whole seconds left until `endsAt`, ticking until it reaches zero. `null`/`undefined` means
 * there is no countdown running, and `fallback` is what to show then.
 *
 * It ticks at 500 ms even though the value it returns is whole seconds, and that is the point.
 * Sampling `Math.ceil(remaining / 1000)` on a 1000 ms interval aliases against the second
 * boundary: the interval and the thing it is measuring drift against each other, so the number
 * visibly sticks on one value and then skips one entirely. Half the period is the cheapest fix
 * (Nyquist, essentially) and costs one extra timer callback per second.
 *
 * This existed four times over — ProjectorSubmission, ProjectorChallengeReveal,
 * MobileHostContent and PlayerSubmit's TimerBar — and had already split 2-2 on the interval,
 * with one of the 1000 ms copies carrying a comment asserting the very reasoning that causes
 * the stutter ("1s is sufficient — displayed value is already integer seconds"). Same shape as
 * the six ranking comparators in bug #25: identical logic, copied, then quietly diverging.
 */
export function useCountdown(endsAt: number | null | undefined, fallback = 0): number {
  // The timer only drives re-renders; the value itself is derived from the clock at render
  // time. Holding the seconds in state instead would leave the previous round's last value on
  // screen for up to one tick whenever `endsAt` changes, and would need a setState inside the
  // effect to avoid it.
  const [, tick] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [endsAt]);

  return endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : fallback;
}
