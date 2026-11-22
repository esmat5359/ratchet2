// Geometry of the RATCHET mark: an asymmetric saw-tooth wheel (a gentle ramp on one side, a hard
// stop on the other) with a pawl.  Shared by the React <Logo/> and scripts/make-brand.mjs so the
// static files in public/brand/ are always the same drawing as the one on screen.
const f = (n) => Math.round(n * 100) / 100;
const pt = (cx, cy, rad, a) => `${f(cx + rad * Math.cos(a))},${f(cy + rad * Math.sin(a))}`;

export const GEAR_N = 10;
export const GEAR_ROT = -Math.PI / 2 - (2 * Math.PI / GEAR_N) * 0.9;

export function gearPath({ cx = 0, cy = 0, R = 41, r = 32.5, n = GEAR_N, rot = GEAR_ROT } = {}) {
  const step = (2 * Math.PI) / n;
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const a0 = rot + i * step;
    if (i === 0) d += `M${pt(cx, cy, r, a0)}`;
    d += ` L${pt(cx, cy, R, a0 + step * 0.74)} L${pt(cx, cy, r, a0 + step * 0.84)} A${r} ${r} 0 0 1 ${pt(cx, cy, r, a0 + step)}`;
  }
  return `${d} Z`;
}

/** The static SVG of the mark (no animation). `id` keeps gradient ids unique when inlined twice. */
export function logoSvg({ id = 'rl', size = 128, bg = null } = {}) {
  const stairs = 'M-14 15 V7 H-7 V0 H0 V-7 H7 V-14 H14 V15 Z';
  const hub = `<path d="${stairs}" fill="url(#${id}b)" stroke="url(#${id}b)" stroke-width="2.6" stroke-linejoin="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-58 -58 116 116" width="${size}" height="${size}" role="img" aria-label="Ratchet">
  <defs>
    <linearGradient id="${id}g" x1="-40" y1="-40" x2="40" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#110FFF"/><stop offset="0.55" stop-color="#7A3CFF"/><stop offset="1" stop-color="#12D6C8"/>
    </linearGradient>
    <linearGradient id="${id}b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#110FFF"/><stop offset="1" stop-color="#12B8D6"/></linearGradient>
    <linearGradient id="${id}p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B1B2E"/><stop offset="1" stop-color="#070707"/></linearGradient>
  </defs>
  ${bg ? `<rect x="-58" y="-58" width="116" height="116" rx="26" fill="${bg}"/>` : ''}
  <path d="${gearPath()}" fill="url(#${id}g)" stroke="url(#${id}g)" stroke-width="3" stroke-linejoin="round"/>
  <circle r="23.5" fill="#fff"/><circle r="23.5" fill="none" stroke="url(#${id}g)" stroke-width="1.6" opacity=".55"/>
  ${hub}
  <g id="${id}pawl"><path d="M1.2 -33.2 L5.8 -39.6 L30 -51 Q36 -52 38 -46.5 Q38.6 -42.5 34 -41 L9.5 -35.6 Q4 -33.2 1.2 -33.2 Z" fill="url(#${id}p)" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><circle cx="33.5" cy="-46.5" r="3.6" fill="#fff"/><circle cx="33.5" cy="-46.5" r="1.5" fill="#070707"/></g>
</svg>`;
}
