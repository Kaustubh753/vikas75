# Card Visual Design Notes

## Reference Images
The physical cards have been photographed. Screenshots are in context/assets/ if available.

---

## Challenge Card Design

### Background
- Deep navy blue: #1a3a6e
- Full bleed, no border visible

### Typography
- Top label: "problem statement" in small, spaced caps, muted light blue (#8aa8cc), centred
- English text: Bold, all caps, white, large (24–28px on card), centred, 2–3 lines
- Hindi text: Regular weight, lighter blue-white (#c8d8f0), smaller than English, centred
- Bottom brand: "Vikas 75" in a stylised font, muted (#8aa8cc), centred

### Icon
- White outline icon, centred between Hindi text and branding
- Style: thin outline, no fill (similar to Tabler icons)
- Size: roughly 80–100px on physical card

### Spacing
- Generous padding on all sides
- English text in upper half, icon in lower half

---

## Scheme Card Design

### Background
- Cream / off-white: #faf8f0 or #f5f0e8
- Slight warm tint, not pure white

### Typography
- Top label: "scheme" in small, spaced caps, muted navy (#8899aa), centred
- English name: Bold, navy blue (#1a3a6e), large (20–22px), all caps, centred
- Hindi name: Bold, navy blue, slightly smaller, centred, below English
- Description: Regular, dark grey, centred, 2–3 lines, medium size
- Bullet points: Left-aligned list, small text, dark grey, below the divider
- Bottom brand: "Vikas 75" stylised, navy, centred

### Tricolour Divider
- Three horizontal stripes: saffron (#FF9933), white (#FFFFFF), green (#138808)
- A circular scheme logo sits in the centre of the divider (each scheme has its own official govt logo)
- For digital version: use the tricolour bar only, no logo (placeholder acceptable)

### Spacing
- Name section at top, divider in middle, bullet points in lower half

---

## Projector Screen Design

### Palette
- Primary background: #1a3a6e (deep navy)
- Text: white and light blue variants
- Accent: saffron #FF9933 for highlights, green #138808 for success states
- Warning / timer: amber
- Winner highlight: gold #FFD700

### Typography scale (projector, large screen)
- Round label (e.g. "Round 3"): 16px, muted
- Challenge text: 40–52px, bold, all caps, white
- Hindi text: 24–28px, lighter blue-white
- Player names: 20px
- Score numbers: 32px, bold

### Animations (describe intent, implement in CSS/Framer)
- Challenge reveal: fade in from black, text slides up
- Submission ticker: player name fades in with a checkmark when they submit
- Judging screen: pulsing dots or spinner, deep navy bg
- Winner reveal: name zooms in, confetti or particle burst optional
- Leaderboard: scores animate counting up

---

## Player Phone UI

### Principles
- Mobile-first, thumb-friendly
- No clutter: one action visible at a time
- Cards are horizontally scrollable in a tray
- Large tap targets (minimum 44px)

### Colour use on phone
- Background: light cream #faf8f0 (matches scheme cards)
- Header bar: navy #1a3a6e
- Selected card: navy border 2px, light blue tint background
- Submit button: navy background, white text, full width
- Waiting state: muted, subtle pulse animation

---

## Fonts

### Recommended
- Headings and game text: "Tiro Devanagari Hindi" or "Noto Sans Devanagari" for Hindi support
- English display text: "Bebas Neue" or "Oswald" for bold game show feel (projector)
- Body text: "Inter" or system sans-serif

### Fallbacks
- If Google Fonts not available: system-ui, sans-serif for body; impact, sans-serif for display

---

## Logo / Branding

- "Vikas 75" text treatment: stylised, slightly italic, uses Devanagari-inspired letterforms
- Colour: navy on light backgrounds, cream/white on dark backgrounds
- Always appears at bottom centre of cards
- On projector: top left corner, small, always visible

---

## Responsive Notes

- Projector view: designed for 1920x1080 minimum, landscape only
- Player view: designed for 375px wide minimum (iPhone SE), portrait primary
- Host panel: tablet or laptop, 768px minimum
- Admin dashboard: desktop only, 1024px minimum
