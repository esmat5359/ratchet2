import { useEffect, useState } from 'react';
import { STATUS, TIERS, threshold } from '../lib/rules.js';
import { cx } from '../lib/format.js';

/** Isometric CSS-3D staircase: one block per tier, doubling as a gauge for the current tier. */
export function Tier3D({ tier = 1, roster = 5, onPick, compact = false }) {
  return (
    <div className={cx('tier3d', compact && 'compact')} aria-label="Tier ladder">
      <div className="tier3d-stage">
        {[1, 2, 3, 4].map((t) => (
          <div key={t} role="button" tabIndex={0} className={cx('tbar', t <= tier && 'on', t === tier && 'cur')} style={{ '--i': t - 1, '--c': TIERS[t].color, '--h': 34 + t * 24 }} onClick={() => onPick?.(t)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPick?.(t); }} aria-label={`Tier ${t} ${TIERS[t].short}`}>
            <span className="f top" /><span className="f front" /><span className="f side" />
            <span className="tlabel"><b>T{t}</b><em>{TIERS[t].short}</em><i>{threshold(t, roster)}/{roster}</i></span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SCENES = [
  { title: 'Identical answers', verdict: 'ok', leader: { A1: false, A3: true, A4: false }, validator: { A1: false, A3: true, A4: false }, note: 'Every per-article boolean and the derived tier are equal.' },
  { title: 'One article differs', verdict: 'bad', leader: { A1: false, A3: true, A4: false }, validator: { A1: false, A3: true, A4: true }, note: 'A single boolean differs. No tolerance, not even one level.' },
  { title: 'Forged tier', verdict: 'bad', leader: { A1: false, A3: false, A4: false }, validator: { A1: false, A3: false, A4: false }, forged: true, note: 'The tier is recomputed from the booleans, so a forged level is rejected.' },
];

/** Animated explainer of the exact-equality rule. */
export function ConsensusDuel() {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState(0);
  useEffect(() => { const id = setInterval(() => setPhase((p) => { if (p === 2) { setI((x) => (x + 1) % SCENES.length); return 0; } return p + 1; }), 1500); return () => clearInterval(id); }, []);
  const s = SCENES[i];
  const row = (obj, forged) => Object.entries(obj).map(([k, v]) => <div key={k} className={cx('duel-row', phase > 0 && 'in')}><span>{k}</span><b className={v ? 'yes' : 'no'}>{String(v)}</b></div>).concat(forged ? [<div key="tier" className="duel-row in"><span>tier</span><b className="forged">4 ≠ 1</b></div>] : []);
  return (
    <div className="duel">
      <div className="duel-tabs">{SCENES.map((x, k) => <button key={x.title} className={k === i ? 'on' : ''} onClick={() => { setI(k); setPhase(0); }}>{x.title}</button>)}</div>
      <div className="duel-grid">
        <div className="duel-card"><h4><i className="leader" />Leader answer</h4>{row(s.leader)}</div>
        <div className={cx('duel-vs', phase === 2 && s.verdict)}>
          {phase < 2 ? <span className="vs-dots"><i /><i /><i /></span> : s.verdict === 'ok' ? <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg> : <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M18 18l16 16M34 18L18 34" /></svg>}
        </div>
        <div className="duel-card"><h4><i className="validator-dot" />Validator, independent</h4>{row(s.validator, s.forged)}</div>
      </div>
      <p className={cx('duel-note', phase === 2 && s.verdict)}>
        {phase < 2 ? 'Comparing…' : s.verdict === 'ok' ? `Accepted. ${s.note}` : `UNDETERMINED, nothing changes. ${s.note}`}
      </p>
    </div>
  );
}

/** Lifecycle of a motion with the current state highlighted. */
export function Lifecycle({ status }) {
  const main = [
    { k: 'FILED', t: 'Filed', s: 'bond escrowed', exits: ['WITHDRAWN', 'EXPIRED'] },
    { k: 'VOTING', t: 'Voting', s: 'AI classified the tier', exits: ['LAPSED', 'REJECTED'] },
    { k: 'CONTESTABLE', t: 'Contestable', s: 'one challenge allowed', exits: ['REJECTED', 'VOID'] },
    { k: 'ENACTED', t: 'Enacted', s: 'effect applied', exits: [] },
  ];
  const order = ['FILED', 'VOTING', 'CONTESTABLE'];
  const cur = status === 'ENACTED' ? 3 : order.indexOf(status);
  const terminalOff = ['WITHDRAWN', 'EXPIRED', 'LAPSED', 'REJECTED', 'VOID'].includes(status);
  return (
    <div className="life">
      <div className="life-main">
        {main.map((n, i) => {
          const done = !terminalOff ? i < cur || (status === 'ENACTED') : false;
          const now = !terminalOff && i === cur;
          return (
            <div key={n.k} className={cx('life-node', done && 'done', now && 'now')}>
              <div className="life-dot">{done ? '✓' : i + 1}</div>
              <b>{n.t}</b><span>{n.s}</span>
              {n.exits.length > 0 && <div className="life-exits">{n.exits.map((e) => <em key={e} className={cx(status === e && 'hit')} title={STATUS[e].desc}>{STATUS[e].label}</em>)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
