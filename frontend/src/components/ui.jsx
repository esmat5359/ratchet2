import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { demoName } from '../lib/demo-names.js';
import { explorerAddress } from '../lib/config.js';
import { cx, fmtGen, sameAddr, shortAddr } from '../lib/format.js';
import { KINDS, STATUS, TIERS } from '../lib/rules.js';
import { useToast } from '../lib/toast.jsx';
import { useWallet } from '../lib/wallet.jsx';
import { BtnSpinner } from './Spinners.jsx';

export function Button({ as: As = 'button', variant = 'primary', size, loading, icon, children, className, ...rest }) {
  return (
    <As className={cx('btn', `btn-${variant}`, size && `btn-${size}`, className)} disabled={loading || rest.disabled} {...rest}>
      {loading ? <BtnSpinner /> : icon}{children}
    </As>
  );
}

export const TierBadge = ({ tier, full = false }) => {
  const t = TIERS[tier]; if (!t) return <span className="badge badge-mute">tier —</span>;
  return <span className="badge tier-badge" style={{ '--c': t.color }}><i>T{tier}</i>{full ? t.short : ''}</span>;
};

export const StatusBadge = ({ status }) => {
  const s = STATUS[status] ?? { label: status, tone: 'mute' };
  return <span className={`badge badge-${s.tone}`} title={s.desc}><span className="dot" />{s.label}</span>;
};

export const KindBadge = ({ kind }) => <span className="badge badge-kind"><i>{KINDS[kind]?.glyph}</i>{KINDS[kind]?.label ?? kind}</span>;

function hue(a) { let h = 0; for (let i = 2; i < (a || '').length; i += 1) h = (h * 31 + a.charCodeAt(i)) % 360; return h; }
export const Avatar = ({ address, size = 22 }) => (
  <span className="avatar" style={{ width: size, height: size, background: `conic-gradient(from ${hue(address)}deg, hsl(${hue(address)} 90% 60%), hsl(${(hue(address) + 70) % 360} 90% 62%), hsl(${(hue(address) + 150) % 360} 85% 58%), hsl(${hue(address)} 90% 60%))` }} />
);

export function AddressChip({ address, long = false, link = true, you }) {
  const toast = useToast(); const w = useWallet();
  if (!address) return <span className="muted">—</span>;
  const mine = you ?? sameAddr(address, w?.account);
  const name = demoName(address);
  const copy = (e) => { e.preventDefault(); navigator.clipboard?.writeText(address); toast.push({ tone: 'ok', text: 'Address copied', ttl: 1600 }); };
  return (
    <span className="addr">
      <Avatar address={address} />
      <button type="button" className="addr-text mono" onClick={copy} title={`${address} — click to copy`}>{name ? <b>{name}</b> : null}{name ? ' ' : ''}{long ? address : shortAddr(address)}</button>
      {mine && <span className="you">you</span>}
      {link && <a className="addr-link" href={explorerAddress(address)} target="_blank" rel="noreferrer" aria-label="Open in explorer">↗</a>}
    </span>
  );
}

export function Stat({ label, value, sub, accent, children }) {
  return (
    <div className={cx('stat', accent && `stat-${accent}`)}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? <span className="skeleton" style={{ width: 70, height: 26, borderRadius: 8 }} />}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {children}
    </div>
  );
}

export const Gen = ({ wei, dp = 6 }) => <span className="gen">{fmtGen(wei, dp)} <small>GEN</small></span>;

export function ErrorCard({ error, onRetry, title = 'Could not read the contract' }) {
  const msg = String(error?.shortMessage ?? error?.message ?? error ?? '');
  return (
    <div className="card error-card">
      <h3>{title}</h3>
      <p className="muted">{/Unexpected token|HTML|<!DOCTYPE/.test(msg) ? 'The Studionet RPC answered with a gateway page. It is rate limited to about 30 requests a minute.' : msg.slice(0, 260) || 'Unknown error.'}</p>
      <p className="hint">Check that the contract address is deployed on GenLayer Studionet (Settings) and try again in a few seconds.</p>
      {onRetry && <Button variant="ghost" size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function Segmented({ value, onChange, options, className }) {
  return (
    <div className={cx('segmented', className)} role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.icon && <i>{o.icon}</i>}{o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, error, children, right }) {
  return (
    <label className="field">
      <span className="field-head"><span className="label">{label}</span>{right && <span className="hint">{right}</span>}</span>
      {children}
      {error ? <span className="err">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </label>
  );
}

export function Countdown({ to, now, done = 'ended' }) {
  const [t, setT] = useState(now());
  useEffect(() => { const i = setInterval(() => setT(now()), 1000); return () => clearInterval(i); }, [now]);
  const left = to - t;
  if (!to) return <span className="muted">—</span>;
  if (left <= 0) return <span className="muted">{done}</span>;
  const m = Math.floor(left / 60); const s = left % 60;
  const d = Math.floor(m / 60 / 24); const h = Math.floor(m / 60) % 24;
  return <b className="mono">{d ? `${d}d ${h}h` : h ? `${h}h ${m % 60}m` : `${m}:${String(s).padStart(2, '0')}`}</b>;
}

export const Crumbs = ({ items }) => (
  <nav className="crumbs" aria-label="Breadcrumb">
    {items.map((it, i) => (it.to ? <Link key={i} to={it.to}>{it.label}</Link> : <span key={i}>{it.label}</span>))}
  </nav>
);

export function PageHead({ eyebrow, title, lead, children }) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {children && <div className="page-head-actions">{children}</div>}
    </header>
  );
}

export const Code = ({ children, lang = 'js' }) => (
  <pre className={`code code-${lang}`}><code>{children}</code></pre>
);
