import { useId } from 'react';
import { Link } from 'react-router-dom';
import { GEAR_N, gearPath } from '../lib/gear.js';

const STAIRS = 'M-14 15 V7 H-7 V0 H0 V-7 H7 V-14 H14 V15 Z';

/** The RATCHET mark.  `animate` makes the wheel click one tooth at a time with the pawl flicking. */
export function LogoMark({ size = 40, animate = false, className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`logomark ${animate ? 'logomark-live' : ''} ${className}`} viewBox="-58 -58 116 116" width={size} height={size} role="img" aria-label="Ratchet logo">
      <defs>
        <linearGradient id={`${id}g`} x1="-40" y1="-40" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#110FFF" /><stop offset=".55" stopColor="#7A3CFF" /><stop offset="1" stopColor="#12D6C8" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#110FFF" /><stop offset="1" stopColor="#12B8D6" /></linearGradient>
        <linearGradient id={`${id}p`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1B1B2E" /><stop offset="1" stopColor="#070707" /></linearGradient>
      </defs>
      <g className="logomark-gear" style={{ '--tooth': `${360 / GEAR_N}deg` }}>
        <path d={gearPath()} fill={`url(#${id}g)`} stroke={`url(#${id}g)`} strokeWidth="3" strokeLinejoin="round" />
        <circle r="23.5" fill="#fff" />
        <circle r="23.5" fill="none" stroke={`url(#${id}g)`} strokeWidth="1.6" opacity=".55" />
        <path d={STAIRS} fill={`url(#${id}b)`} stroke={`url(#${id}b)`} strokeWidth="2.6" strokeLinejoin="round" />
      </g>
      <g className="logomark-pawl">
        <path d="M1.2 -33.2 L5.8 -39.6 L30 -51 Q36 -52 38 -46.5 Q38.6 -42.5 34 -41 L9.5 -35.6 Q4 -33.2 1.2 -33.2 Z" fill={`url(#${id}p)`} stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx="33.5" cy="-46.5" r="3.6" fill="#fff" /><circle cx="33.5" cy="-46.5" r="1.5" fill="#070707" />
      </g>
    </svg>
  );
}

export function Logo({ size = 38, to = '/', light = false, tagline = true }) {
  return (
    <Link to={to} className={`logo ${light ? 'logo-light' : ''}`} aria-label="Ratchet home">
      <LogoMark size={size} animate />
      <span className="logo-text">
        <b>Ratchet</b>
        {tagline && <i>on GenLayer</i>}
      </span>
    </Link>
  );
}
