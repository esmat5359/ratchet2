import { useRef } from 'react';

/** A card that tilts toward the pointer in 3D (CSS transforms; disabled for reduced motion / touch). */
export function Tilt({ children, className = '', max = 9, as: As = 'div', ...rest }) {
  const ref = useRef(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const move = (e) => {
    if (reduce || e.pointerType === 'touch') return;
    const el = ref.current; const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`);
    el.style.setProperty('--rx', `${(0.5 - py) * max * 2}deg`);
    el.style.setProperty('--gx', `${px * 100}%`); el.style.setProperty('--gy', `${py * 100}%`);
  };
  const leave = () => { const el = ref.current; el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); };
  return <As ref={ref} className={`tilt ${className}`} onPointerMove={move} onPointerLeave={leave} {...rest}><span className="tilt-glare" aria-hidden="true" />{children}</As>;
}
