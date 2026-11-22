import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { DEFAULT_CONTRACT, LINKS, explorerAddress, getContract, isDemo, setContract, setDemo } from '../lib/config.js';
import { isAddress, shortAddr } from '../lib/format.js';
import { refreshAll } from '../lib/api.js';
import { Logo } from './Logo.jsx';
import { Mochi } from './Mochi.jsx';
import { Modal, NetworkPill, WalletButton } from './Wallet.jsx';
import { Button, Field } from './ui.jsx';
import { useToast } from '../lib/toast.jsx';

const NAV = [
  ['/assembly', 'Assembly'], ['/charter', 'Charter'], ['/motions', 'Motions'], ['/docs', 'Docs'],
];

export function TopBar({ onSettings }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  return (
    <header className="topbar">
      <div className="container topbar-in">
        <Logo />
        <nav className={`nav ${open ? 'open' : ''}`} aria-label="Main">
          {NAV.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>)}
          <NavLink to="/file" className={({ isActive }) => `nav-cta ${isActive ? 'active' : ''}`}>File a motion</NavLink>
        </nav>
        <div className="topbar-right">
          <NetworkPill />
          <button className="icon-btn" onClick={onSettings} aria-label="Settings" title="Settings">⚙</button>
          <WalletButton />
          <button className="burger" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}><span /><span /><span /></button>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const c = getContract();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo tagline={false} />
          <p>A self-tightening constitution for small assemblies. Validators judge meaning, reproduce each other exactly, and the bar only ever goes up.</p>
          <a className="built-on" href={LINKS.genlayer} target="_blank" rel="noreferrer">
            <span>Built on</span><img src={`${import.meta.env.BASE_URL}brand/genlayer-logo-black.svg`} alt="GenLayer" height="22" />
          </a>
        </div>
        <div>
          <h4>App</h4>
          <Link to="/assembly">Assembly</Link><Link to="/charter">Charter</Link><Link to="/motions">Motions</Link><Link to="/file">File a motion</Link><Link to="/deploy">Deploy your own</Link>
        </div>
        <div>
          <h4>Learn</h4>
          <Link to="/docs/introduction">Introduction</Link><Link to="/docs/quickstart">Quickstart</Link><Link to="/docs/consensus">Consensus rule</Link><Link to="/docs/contract-api">Contract API</Link><Link to="/docs/faq">FAQ</Link>
        </div>
        <div>
          <h4>Project</h4>
          <a href={LINKS.github} target="_blank" rel="noreferrer">GitHub ↗</a>
          <a href={LINKS.x} target="_blank" rel="noreferrer">@amirhp771 on X ↗</a>
          <a href={LINKS.studio} target="_blank" rel="noreferrer">GenLayer Studio ↗</a>
          <a href={LINKS.gdocs} target="_blank" rel="noreferrer">GenLayer docs ↗</a>
        </div>
        <div className="footer-mochi"><Mochi size={150} small /></div>
      </div>
      <div className="container footer-base">
        <span>Contract <a className="mono" href={explorerAddress(c)} target="_blank" rel="noreferrer">{shortAddr(c, 8, 6)}</a> on GenLayer Studionet{isDemo() ? ' (demo)' : ''}</span>
        <span>MIT licensed · not audited · reference implementation</span>
      </div>
    </footer>
  );
}

export function SettingsModal({ open, onClose }) {
  const toast = useToast();
  const [addr, setAddr] = useState(getContract());
  useEffect(() => { if (open) setAddr(getContract()); }, [open]);
  const valid = isAddress(addr);
  const save = () => {
    setContract(addr.trim()); refreshAll(); onClose();
    toast.push({ tone: 'ok', title: 'Contract updated', text: addr.trim().toLowerCase() === DEFAULT_CONTRACT.toLowerCase() ? 'Using the default deployment.' : `Now reading ${shortAddr(addr.trim(), 8, 6)}.` });
    setTimeout(() => window.location.reload(), 350);
  };
  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <Field label="Ratchet contract address" hint="The assembly this site reads and writes. Stored only in this browser." error={addr && !valid ? 'Enter a 42-character 0x address.' : null}>
        <input className="input mono" value={addr} onChange={(e) => setAddr(e.target.value)} spellCheck={false} disabled={isDemo()} />
      </Field>
      <div className="row gap-sm wrap">
        <Button onClick={save} disabled={!valid || isDemo()}>Save</Button>
        <Button variant="ghost" onClick={() => setAddr(DEFAULT_CONTRACT)} disabled={isDemo()}>Reset to default</Button>
      </div>
      <hr className="sep" />
      <div className="row between gap-sm wrap">
        <div>
          <b>Demo mode</b>
          <p className="muted" style={{ margin: '2px 0 0' }}>A simulated assembly and a demo wallet. Nothing touches a network. Great for trying the whole flow.</p>
        </div>
        <Button variant={isDemo() ? 'dark' : 'ghost'} onClick={() => setDemo(!isDemo())}>{isDemo() ? 'Exit demo' : 'Enter demo'}</Button>
      </div>
    </Modal>
  );
}
