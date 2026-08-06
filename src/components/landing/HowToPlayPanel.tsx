'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/* "How to Play" — the landing page's right-hand column.
 *
 * Two layouts from one component:
 *   stage — one step at a time, advancing on its own, with a five-row index pinned to the bottom.
 *   list  — all five steps at once, no timer. Used where the column stacks (phones) and for
 *           anyone who prefers reduced motion.
 *
 * Built from the design handoff. DM Sans in the spec maps to Inter, the page's existing sans;
 * Press Start 2P is loaded in layout.tsx and used only for the big numeral and the step counter.
 */

/** Dwell between steps. The handoff leaves this open at roughly 3.5–5s; its own mock runs 4200ms,
 *  which is the floor of comfortable for step 05's longer body. Inter sets a little wider than the
 *  mock's DM Sans, so 4.5s keeps that step relaxed without the panel feeling slow. One interval
 *  for all five steps — per-step timings read as unsteady. */
export const STEP_DWELL_MS = 4500;

const STEPS = [
  { num: '01', title: 'Get a room',       label: 'Get a room',       body: 'Host a game and share the four-letter code. Players join from their devices.' },
  { num: '02', title: 'See the problem',  label: 'See the problem',  body: 'A problem statement goes up on the big screen. Everyone answers the same one.' },
  { num: '03', title: 'Play your scheme', label: 'Play your scheme', body: 'You hold real government schemes. Pick the one that answers the problem.' },
  { num: '04', title: 'Make your case',   label: 'Make your case',   body: 'The clock runs while you argue it. Say what your scheme does and why it fits.' },
  { num: '05', title: 'Best answer wins', label: 'Best answer wins', body: 'The AI judge scores fit first, then how well you argued it. Win the most rounds to take the game.' },
];

/* The bodies differ in length — step 05 runs to four lines where step 03 takes two. Left to
 * itself the stage centres each one, so the numeral and title jump between steps. Reserving the
 * tallest body's height keeps all five identical: the numeral, title and first line of body land
 * in the same place every time. */
const BODY_MIN_LINES = 4;

const CREAM = '#f5efdc';
const SAFFRON = '#FF9933';
const HAIRLINE = 'rgba(245,239,220,0.13)';
const ROW_RULE = 'rgba(245,239,220,0.1)';
const SANS = 'var(--font-inter),sans-serif';
const PRESS = "var(--font-press),'Press Start 2P',monospace";

const shell: React.CSSProperties = {
  height: '100%', width: '100%', boxSizing: 'border-box',
  border: `1px solid ${HAIRLINE}`,
  borderRadius: 12,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0))',
  fontFamily: SANS, color: CREAM,
  display: 'flex', flexDirection: 'column',
  padding: '24px 22px 22px',
};

function Header({ counter }: { counter: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(245,239,220,0.75)' }}>
        How to play
      </span>
      <span style={{ fontFamily: PRESS, fontSize: 9, color: 'rgba(245,239,220,0.4)' }}>{counter}</span>
    </div>
  );
}

/** All five steps, no timer. The counter reads "5 STEPS" — a live "STEP n/5" would contradict a
 *  layout where every step is already on screen. */
function ListLayout() {
  return (
    <div style={shell}>
      <Header counter="5 STEPS" />
      <div style={{ paddingTop: 18 }}>
        {STEPS.map((s, i) => (
          <div
            key={s.num}
            style={{
              display: 'grid', gridTemplateColumns: '34px 1fr', columnGap: 12,
              padding: i === 0 ? '0 0 16px' : i === STEPS.length - 1 ? '16px 0 0' : '16px 0',
              borderBottom: i === STEPS.length - 1 ? undefined : `1px solid ${ROW_RULE}`,
            }}
          >
            <div style={{ fontStyle: 'italic', fontWeight: 700, fontSize: 17, fontFeatureSettings: "'tnum'", color: SAFFRON }}>
              {s.num}
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, margin: '0 0 4px' }}>{s.title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.45, color: 'rgba(245,239,220,0.62)', margin: 0 }}>{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StageLayout({ active }: { active: boolean }) {
  const [i, setI] = useState(0);
  const [fill, setFill] = useState(0);
  // Only pauses a visitor cannot see: off screen, or a backgrounded tab. Hovering deliberately
  // does NOT pause. The handoff asks for it, but the panel sits in the column your pointer
  // crosses to read it, so in use it just looked like the timer had died mid-sequence.
  const [visible, setVisible] = useState(true);
  // One size step for short panels (the 1366x640 case). Measured off the panel itself rather than
  // the viewport, since the panel's height is what has to fit. A CSS container query expresses
  // this more directly but needs `container-type: size`, whose size containment collapses this
  // panel inside its grid cell — it measured 46px wide against a 317px cell.
  const [compact, setCompact] = useState(false);
  const armer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Restart the progress line: drop to 0 with no transition, then re-arm on the next tick so the
  // browser paints the reset before the 0 → 100% run begins.
  const arm = useCallback(() => {
    if (armer.current) clearTimeout(armer.current);
    setFill(0);
    armer.current = setTimeout(() => setFill(100), 40);
  }, []);

  const paused = !visible || !active;

  // Hold at step 01 until the panel is actually on show. The landing renders behind the intro,
  // so without this the sequence runs through the whole intro and the first thing a visitor sees
  // is step 03. Re-arming here also starts the progress line the moment the panel appears.
  useEffect(() => {
    if (!active) { setI(0); return; }
    arm();
  }, [active, arm]);

  useEffect(() => () => { if (armer.current) clearTimeout(armer.current); }, []);

  // One timeout per step rather than a free-running interval, re-created whenever the step changes.
  // A shared interval keeps its own schedule, so picking a step late in a dwell would advance again
  // a moment later; this way every step — picked or automatic — gets the full dwell, and the
  // progress line always matches the time actually left.
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => { setI(prev => (prev + 1) % STEPS.length); arm(); }, STEP_DWELL_MS);
    return () => clearTimeout(t);
  }, [paused, i, arm]);

  // Don't run the timeline for a panel nobody can see — scrolled away or a backgrounded tab.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCompact(e.contentRect.height < 600));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    const onVis = () => setVisible(document.visibilityState === 'visible' && !document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => { ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  // Picking a step jumps to it and carries on from there, timer and all. The handoff asks for a
  // manual pick to stop autoplay for the session, but in use that made one click freeze the panel
  // for good: no advance, and an empty bar on every step thereafter, which reads as broken.
  const pick = (n: number) => { setI(n); arm(); };
  const step = STEPS[i];

  return (
    <div
      ref={panelRef}
      className="htp-panel"
      style={shell}
    >
      <Header counter={`STEP ${i + 1}/5`} />

      {/* Progress hairline — one dwell period, restarted on every change including manual picks */}
      <div style={{ height: 1, background: HAIRLINE, marginTop: 14 }}>
        <div
          style={{
            height: 1, background: SAFFRON, width: `${fill}%`,
            transition: fill === 0 ? 'none' : `width ${STEP_DWELL_MS}ms linear`,
          }}
        />
      </div>

      {/* Stage. One size step down when the panel is short (see `compact` above). */}
      <div
        className="htp-stage"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0, padding: `${compact ? 20 : 28}px 0` }}
      >
        <div
          className="htp-num"
          style={{ fontFamily: PRESS, fontSize: compact ? 44 : 58, lineHeight: 1, color: SAFFRON, fontFeatureSettings: "'tnum'", marginBottom: compact ? 18 : 26 }}
        >
          {step.num}
        </div>
        <h3 className="htp-title" style={{ fontSize: compact ? 24 : 30, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.01em', margin: '0 0 12px' }}>
          {step.title}
        </h3>
        <p
          className="htp-body"
          style={{
            fontSize: compact ? 14 : 15, lineHeight: 1.55, color: 'rgba(245,239,220,0.68)', margin: 0,
            minHeight: `${BODY_MIN_LINES * 1.55}em`,   // every step reserves the tallest body — see BODY_MIN_LINES
          }}
        >
          {step.body}
        </p>
      </div>

      {/* Index — where you are in the sequence, and a way to take control */}
      <div>
        {STEPS.map((s, n) => {
          const active = n === i;
          return (
            <button
              key={s.num}
              onClick={() => pick(n)}
              aria-current={active ? 'step' : undefined}
              aria-label={`Step ${n + 1}: ${s.label}`}
              style={{
                width: '100%', background: 'none', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
                borderTop: `1px solid ${ROW_RULE}`,
                borderBottom: n === STEPS.length - 1 ? `1px solid ${ROW_RULE}` : 'none',
                borderLeft: 'none', borderRight: 'none',
                color: active ? CREAM : 'rgba(245,239,220,0.45)',
                transition: 'color 200ms',
                minHeight: 44,   // comfortable hit area on touch; the mock's rows are 35px
                fontFamily: SANS,
              }}
            >
              <span style={{ fontStyle: 'italic', fontWeight: 700, fontSize: 12, fontFeatureSettings: "'tnum'", width: 20 }}>
                {s.num}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</span>
              <span style={{ marginLeft: 'auto', width: 22, height: 2, background: active ? SAFFRON : 'transparent' }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** `layout` forces the list (used where the column stacks). Reduced-motion callers get the list
 *  too — the handoff asks for no autoplay at all in that case. */
export default function HowToPlayPanel({ layout = 'stage', active = true }: { layout?: 'stage' | 'list'; active?: boolean }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  return layout === 'list' || reduced ? <ListLayout /> : <StageLayout active={active} />;
}
