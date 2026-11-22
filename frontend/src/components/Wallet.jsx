import { useEffect, useRef, useState } from 'react';
import { CHAIN, isDemo } from '../lib/config.js';
import { fmtGen, shortAddr } from '../lib/format.js';
import { useToast } from '../lib/toast.jsx';
import { useWallet } from '../lib/wallet.jsx';
import { Mochi } from './Mochi.jsx';
import { Avatar, Button } from './ui.jsx';
import { BtnSpinner } from './Spinners.jsx';

export function Modal({ open, onClose, title, children, wide, locked }) {
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => { if (e.key === 'Escape' && !locked) onClose?.(); };
    window.addEventListener('keydown', k); document.body.classList.add('no-scroll');
    return () => { window.removeEventListener('keydown', k); document.body.classList.remove('no-scroll'); };
  }, [open, onClose, locked]);
  if (!open) return null;
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget && !locked) onClose?.(); }}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        {!locked && <button className="modal-x" onClick={onClose} aria-label="Close">×</button>}
        {title && <h2 className="modal-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function WalletModal() {
  const w = useWallet();
  return (
    <Modal open={w.modalOpen} onClose={w.closeModal} title="Connect a wallet">
      <p className="muted" style={{ marginTop: -6 }}>Wallets announce themselves to this page with <b>EIP-6963</b>, so every installed wallet shows up here and you choose which one to use.</p>
      {w.providers.length === 0 ? (
        <div className="wallet-empty">
          <Mochi size={120} small />
          <div>
            <b>No wallet detected</b>
            <p className="muted">Install a browser wallet such as MetaMask or Rabby, then reload this page. Or{' '}
              {isDemo() ? 'use the Ratchet Demo Wallet.' : <button className="linklike" onClick={() => { window.localStorage.setItem('ratchet.demo', '1'); window.location.reload(); }}>try the demo mode</button>}.
            </p>
          </div>
        </div>
      ) : (
        <ul className="wallet-list">
          {w.providers.map((p) => (
            <li key={p.info.uuid}>
              <button className="wallet-row" onClick={() => w.connect(p.info.uuid)} disabled={w.status === 'connecting'}>
                {p.info.icon ? <img src={p.info.icon} alt="" width="34" height="34" /> : <span className="wallet-ph">{p.info.name?.[0]}</span>}
                <span><b>{p.info.name}</b><small className="mono">{p.info.rdns}</small></span>
                <span className="wallet-go">{w.status === 'connecting' ? <BtnSpinner /> : 'Connect'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {w.error && <p className="err">{w.error}</p>}
      <p className="hint" style={{ marginTop: 14 }}>After connecting, your wallet will be asked to switch to <b>{CHAIN.name}</b> (chain {CHAIN.id}) if it is on another network.</p>
    </Modal>
  );
}

export function WalletButton() {
  const w = useWallet(); const toast = useToast();
  const [open, setOpen] = useState(false); const ref = useRef(null);
  useEffect(() => {
    const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f);
  }, []);

  if (!w.connected) {
    return <Button size="sm" onClick={w.openModal} loading={w.status === 'connecting'}>Connect wallet</Button>;
  }
  return (
    <div className="wallet-btn" ref={ref}>
      <button className={`wallet-pill ${w.wrongNetwork ? 'bad' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {w.active?.info?.icon ? <img src={w.active.info.icon} width="18" height="18" alt="" /> : <Avatar address={w.account} size={18} />}
        <span className="mono">{shortAddr(w.account, 4, 4)}</span>
        {w.balance != null && !w.wrongNetwork && <span className="bal">{fmtGen(w.balance, 3)} GEN</span>}
        {w.wrongNetwork && <span className="bal">wrong network</span>}
        <i>▾</i>
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <Avatar address={w.account} size={34} />
            <div><b>{w.active?.info?.name}</b><span className="mono">{shortAddr(w.account, 8, 6)}</span></div>
          </div>
          <div className={`menu-net ${w.onStudionet ? 'ok' : 'bad'}`}>
            <span className="dot" />{w.onStudionet ? `${CHAIN.short} · chain ${CHAIN.id}` : `Chain ${w.chainId ?? '?'} · not ${CHAIN.short}`}
          </div>
          <button role="menuitem" onClick={() => { navigator.clipboard?.writeText(w.account); toast.push({ tone: 'ok', text: 'Address copied', ttl: 1600 }); setOpen(false); }}>Copy address</button>
          {w.wrongNetwork && <button role="menuitem" className="accent" onClick={() => { setOpen(false); w.switchNetwork(); }}>Switch to {CHAIN.short}</button>}
          <button role="menuitem" onClick={() => { setOpen(false); w.openModal(); }}>Use another wallet</button>
          <button role="menuitem" className="danger" onClick={() => { setOpen(false); w.disconnect(); }}>Disconnect</button>
        </div>
      )}
    </div>
  );
}

export function NetworkPill() {
  const w = useWallet();
  if (!w.connected) return <span className="net-pill idle" title="Reads work without a wallet"><span className="dot" />{CHAIN.short}</span>;
  if (w.wrongNetwork) return <button className="net-pill bad" onClick={w.switchNetwork} title="Click to switch"><span className="dot" />Wrong network</button>;
  return <span className="net-pill ok"><span className="dot" />{CHAIN.short}</span>;
}

export function NetworkBanner() {
  const w = useWallet();
  if (!w.wrongNetwork) return null;
  return (
    <div className="net-banner" role="alert">
      <div className="container row between wrap gap-sm">
        <div><b>Your wallet is on the wrong network.</b> It is connected to chain {w.chainId}; Ratchet lives on <b>{CHAIN.name}</b> (chain {CHAIN.id}).</div>
        <Button size="sm" variant="dark" loading={w.switching} onClick={w.switchNetwork}>Switch to {CHAIN.short}</Button>
      </div>
    </div>
  );
}
