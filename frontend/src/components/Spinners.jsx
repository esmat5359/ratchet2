import { useId } from 'react';
import { GEAR_N, gearPath } from '../lib/gear.js';

/** A wheel that advances one tooth at a time, with the pawl catching it: the signature loader. */
export function RatchetSpinner({ size = 72, label, tone = 'brand' }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className={`spinner spinner-${tone}`} role="status" aria-live="polite">
      <svg viewBox="-58 -58 116 116" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}g`} x1="-40" y1="-40" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#110FFF" /><stop offset=".55" stopColor="#7A3CFF" /><stop offset="1" stopColor="#12D6C8" />
          </linearGradient>
        </defs>
        <circle r="53" fill="none" stroke="url(#g)" strokeWidth="0" />
        <circle className="spin-orbit" r="52" fill="none" stroke={`url(#${id}g)`} strokeWidth="1.4" strokeDasharray="2 7" strokeLinecap="round" opacity=".55" />
        <g className="spin-gear" style={{ '--tooth': `${360 / GEAR_N}deg` }}>
          <path d={gearPath({ R: 38, r: 30 })} fill={`url(#${id}g)`} stroke={`url(#${id}g)`} strokeWidth="2.6" strokeLinejoin="round" />
          <circle r="16" fill="#fff" />
          <path d="M-9 10 V4 H-4.5 V-1 H0 V-6 H4.5 V-10 H9 V10 Z" fill={`url(#${id}g)`} />
        </g>
        <g className="spin-pawl">
          <path d="M1 -31 L5 -37 L27 -47 Q33 -48 35 -43 Q35.5 -40 31.5 -38.5 L9 -33.5 Q3.5 -31 1 -31 Z" fill="#12122A" />
          <circle cx="30.5" cy="-43" r="3.2" fill="#fff" /><circle cx="30.5" cy="-43" r="1.3" fill="#12122A" />
        </g>
      </svg>
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
}

/** Five validators orbit a core and converge: used while the AI consensus runs. */
export function ConsensusLoader({ size = 150, label }) {
  return (
    <div className="consensus" style={{ width: size, height: size }} role="status" aria-live="polite">
      <div className="consensus-ring r1" /><div className="consensus-ring r2" />
      <div className="consensus-core"><RatchetSpinner size={size * 0.38} /></div>
      {[0, 1, 2, 3, 4].map((i) => <span key={i} className="validator" style={{ '--i': i }} />)}
      {label && <span className="consensus-label">{label}</span>}
    </div>
  );
}

export function BtnSpinner() { return <span className="btn-spin" aria-hidden="true" />; }

export function Skeleton({ w = '100%', h = 16, r = 8, style }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** Full-page first paint: shown while the router chunk loads. */
export function PageLoader({ label = 'Tightening the ratchet…' }) {
  return <div className="page-loader"><RatchetSpinner size={92} label={label} /></div>;
}
