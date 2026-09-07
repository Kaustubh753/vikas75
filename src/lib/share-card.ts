// Client-side generator for the shareable result card — a 1080×1350 PNG (WhatsApp's 4:5
// portrait sweet spot) drawn on a canvas from the final standings. Drawing on the client,
// with the page's own fonts and same-origin avatar images, sidesteps everything a server
// image route would need (font bundling for Devanagari names, a public endpoint, cold
// starts) and works identically inside the Android TWA. Nothing secret goes in: names,
// avatars and scores are exactly what the projector already shows the room.

export interface ShareStanding {
  name: string;
  avatarId: string;
  score: number;
  roundsWon: number;
  isMe: boolean;
}

export interface ShareCardInput {
  code: string;
  totalRounds: number;
  standings: ShareStanding[]; // best first — caller sorts (roundsWon → score, same as projector)
  origin: string;             // e.g. https://vikas75.vercel.app — printed as the play link
}

const W = 1080;
const H = 1350;
const SAFFRON = '#FF9933';
const GOLD = '#FFD700';
const GREEN = '#138808';
const NAVY = '#0d1b35';
const INK = '#08070f';
const CREAM = 'rgba(250,248,240,';

/** The page's real font families (next/font hashes its names — read them, don't guess). */
function fontFamilies() {
  const styles = getComputedStyle(document.documentElement);
  const bebas = styles.getPropertyValue('--font-bebas').trim() || 'sans-serif';
  const inter = styles.getPropertyValue('--font-inter').trim() || 'sans-serif';
  return { bebas: `${bebas}, sans-serif`, inter: `${inter}, system-ui, sans-serif` };
}

function loadAvatar(avatarId: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // fail soft — an initial-letter disc is drawn instead
    img.src = `/avatars/${avatarId}.webp`;
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  name: string,
  x: number, y: number, size: number,
  interFamily: string,
) {
  ctx.save();
  roundedRect(ctx, x, y, size, size, size * 0.24);
  ctx.clip();
  if (img) {
    ctx.drawImage(img, x, y, size, size);
  } else {
    ctx.fillStyle = NAVY;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = `${CREAM}0.8)`;
    ctx.font = `700 ${size * 0.45}px ${interFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((name.trim()[0] ?? '?').toUpperCase(), x + size / 2, y + size / 2 + size * 0.03);
  }
  ctx.restore();
}

/** Trim a name to fit `maxWidth` at the current font, with an ellipsis if it was cut. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

export async function buildShareCard(input: ShareCardInput): Promise<Blob> {
  // Fonts must be resolved before any measureText/fillText, or names render in the fallback.
  try { await document.fonts.ready; } catch { /* older browsers — system fonts still work */ }
  const { bebas, inter } = fontFamilies();

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');

  // Ground: deep navy fading to ink, the projector's own palette.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, NAVY);
  bg.addColorStop(1, INK);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Tricolour top band.
  ctx.fillStyle = SAFFRON; ctx.fillRect(0, 0, W, 12);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 12, W, 6);
  ctx.fillStyle = GREEN; ctx.fillRect(0, 18, W, 12);

  // Header.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = SAFFRON;
  ctx.font = `120px ${bebas}`;
  ctx.fillText('VIKAS 75', W / 2, 170);
  ctx.fillStyle = `${CREAM}0.55)`;
  ctx.font = `600 26px ${inter}`;
  ctx.fillText('SARKARI SCHEMES  •  ASLI JUGAAD', W / 2, 212);
  ctx.fillStyle = `${CREAM}0.4)`;
  ctx.font = `500 24px ${inter}`;
  ctx.fillText(`GAME RESULT  —  ROOM ${input.code.toUpperCase()}  •  ${input.totalRounds} ROUND${input.totalRounds === 1 ? '' : 'S'}`, W / 2, 258);

  const standings = input.standings;
  const avatars = await Promise.all(standings.slice(0, 3).map((s) => loadAvatar(s.avatarId)));

  // Podium: the top three as full rows — big, legible in a WhatsApp thumbnail.
  const MEDALS = ['🥇', '🥈', '🥉'];
  const rowX = 70;
  const rowW = W - 140;
  let y = 320;
  standings.slice(0, 3).forEach((p, i) => {
    const rowH = i === 0 ? 190 : 150;
    const pad = i === 0 ? 26 : 20;
    const avatarSize = rowH - pad * 2;

    ctx.save();
    roundedRect(ctx, rowX, y, rowW, rowH, 28);
    ctx.fillStyle = i === 0 ? 'rgba(255,215,0,0.10)' : 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.lineWidth = i === 0 ? 3 : 1.5;
    ctx.strokeStyle = p.isMe ? SAFFRON : i === 0 ? 'rgba(255,215,0,0.55)' : 'rgba(255,255,255,0.14)';
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.font = `${i === 0 ? 64 : 52}px ${inter}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(MEDALS[i], rowX + pad, y + rowH / 2 + 4);

    drawAvatar(ctx, avatars[i], p.name, rowX + pad + (i === 0 ? 96 : 82), y + pad, avatarSize, inter);

    const nameX = rowX + pad + (i === 0 ? 96 : 82) + avatarSize + 28;
    const rightX = rowX + rowW - pad;
    ctx.fillStyle = i === 0 ? GOLD : `${CREAM}0.92)`;
    ctx.font = `${i === 0 ? 74 : 58}px ${bebas}`;
    const trophies = `${p.roundsWon} 🏆`;
    ctx.textAlign = 'right';
    ctx.font = `600 ${i === 0 ? 40 : 34}px ${inter}`;
    const trophyW = ctx.measureText(trophies).width;
    ctx.fillStyle = `${CREAM}0.85)`;
    ctx.fillText(trophies, rightX, y + rowH / 2 - (i === 0 ? 18 : 14));
    ctx.fillStyle = `${CREAM}0.45)`;
    ctx.font = `500 ${i === 0 ? 30 : 26}px ${inter}`;
    ctx.fillText(`${p.score} pts`, rightX, y + rowH / 2 + (i === 0 ? 30 : 26));

    ctx.textAlign = 'left';
    ctx.fillStyle = i === 0 ? GOLD : `${CREAM}0.92)`;
    ctx.font = `${i === 0 ? 74 : 58}px ${bebas}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(fitText(ctx, p.name, rightX - nameX - trophyW - 40), nameX, y + rowH / 2 + 6);
    if (p.isMe) {
      ctx.fillStyle = SAFFRON;
      ctx.font = `700 24px ${inter}`;
      ctx.fillText('YOU', nameX + 4, y + rowH - 26);
    }

    y += rowH + 18;
  });

  // The rest of the table, compact. The sharer's own row is always shown even past the cut.
  const rest = standings.slice(3);
  const meIdx = standings.findIndex((s) => s.isMe);
  const LIST_MAX = 5;
  const listed = rest.slice(0, LIST_MAX);
  if (meIdx >= 3 + LIST_MAX && !listed.some((s) => s.isMe)) listed[listed.length - 1] = standings[meIdx];
  ctx.textBaseline = 'alphabetic';
  listed.forEach((p) => {
    const place = standings.indexOf(p) + 1;
    y += 44;
    ctx.textAlign = 'left';
    ctx.fillStyle = p.isMe ? SAFFRON : `${CREAM}0.6)`;
    ctx.font = `${p.isMe ? 700 : 500} 30px ${inter}`;
    ctx.fillText(fitText(ctx, `#${place}  ${p.name}${p.isMe ? '  (you)' : ''}`, rowW - 220), rowX + 10, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${p.roundsWon} 🏆  ·  ${p.score} pts`, rowX + rowW - 10, y);
  });
  const unlisted = rest.length - listed.length;
  if (unlisted > 0) {
    y += 40;
    ctx.textAlign = 'left';
    ctx.fillStyle = `${CREAM}0.35)`;
    ctx.font = `500 26px ${inter}`;
    ctx.fillText(`+ ${unlisted} more player${unlisted === 1 ? '' : 's'}`, rowX + 10, y);
  }

  // Footer: the invitation. This card exists so someone in a WhatsApp group taps the link.
  ctx.textAlign = 'center';
  ctx.fillStyle = `${CREAM}0.14)`;
  ctx.fillRect(70, H - 190, W - 140, 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = `52px ${bebas}`;
  ctx.fillText('CAN YOUR SQUAD BEAT US?', W / 2, H - 122);
  ctx.fillStyle = SAFFRON;
  ctx.font = `700 30px ${inter}`;
  ctx.fillText(input.origin.replace(/^https?:\/\//, ''), W / 2, H - 74);
  ctx.fillStyle = `${CREAM}0.35)`;
  ctx.font = `500 22px ${inter}`;
  ctx.fillText('from the Office of Sujeet Kumar', W / 2, H - 34);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas export failed'))), 'image/png');
  });
}
