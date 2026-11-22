import { useState } from 'react';
import { Link } from 'react-router-dom';
import ratchetSource from '../contract/Ratchet.py?raw';
import { setContract } from '../lib/config.js';
import { fmtGen, isAddress, parseGen, utf8Len } from '../lib/format.js';
import { LIMITS, TIERS, validArticleId } from '../lib/rules.js';
import { useWallet } from '../lib/wallet.jsx';
import { Button, Field, PageHead } from '../components/ui.jsx';
import { useTx } from '../components/Tx.jsx';

const EXAMPLE = [
  { id: 'A1', tier: 1, text: 'Meetings are held on the first Sunday of every month.' },
  { id: 'A2', tier: 4, text: 'Membership can only be granted or withdrawn by the assembly itself; no officer may add or remove a member alone.' },
  { id: 'A3', tier: 3, text: 'Treasury funds may never be spent on political campaigns.' },
  { id: 'A4', tier: 2, text: 'The newsletter is sent by e-mail once a month.' },
];

export default function Deploy() {
  const w = useWallet(); const tx = useTx();
  const [name, setName] = useState('My Assembly');
  const [founders, setFounders] = useState('');
  const [bond, setBond] = useState('0.004');
  const [vm, setVm] = useState(10); const [cm, setCm] = useState(10);
  const [arts, setArts] = useState(EXAMPLE);

  const list = [...new Set([w.account, ...founders.split(/[\s,;]+/)].filter(Boolean).map((x) => x.toLowerCase()))];
  const e = {};
  if (!name.trim() || utf8Len(name.trim()) > LIMITS.MAX_NAME_BYTES) e.name = 'Required, at most 60 bytes.';
  if (list.length < LIMITS.MIN_MEMBERS || list.length > LIMITS.MAX_MEMBERS) e.founders = `${LIMITS.MIN_MEMBERS}–${LIMITS.MAX_MEMBERS} distinct founders (you are included). Now: ${list.length}.`;
  else if (list.some((x) => !isAddress(x))) e.founders = 'Every founder must be a valid 0x address.';
  const bw = parseGen(bond); if (bw === null || bw <= 0n) e.bond = 'Enter a positive amount.';
  if (!(vm >= 2 && vm <= 10080) || !(cm >= 2 && cm <= 10080)) e.win = 'Windows are 2–10080 minutes.';
  const ids = arts.map((x) => x.id);
  if (arts.length > LIMITS.MAX_ARTICLES) e.arts = 'At most 12 articles.';
  else if (arts.some((x) => !validArticleId(x.id) || !x.text.trim() || utf8Len(x.text) > 500)) e.arts = 'Each article needs a valid id (A–Z, 0–9, _) and text up to 500 bytes.';
  else if (new Set(ids).size !== ids.length) e.arts = 'Article ids must be unique.';
  const bad = Object.keys(e).length > 0;

  const upd = (i, k, v) => setArts((l) => l.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const go = () => tx.run({
    title: 'Deploy a new assembly', ai: false,
    deploy: { code: ratchetSource, args: [name.trim(), list, JSON.stringify(arts.map((x) => ({ id: x.id, text: x.text.trim(), tier: x.tier }))), bw, BigInt(vm), BigInt(cm)] },
    successTitle: 'Assembly deployed', successText: 'Your Ratchet assembly is live on Studionet. This site now points at it.',
    onDone: (r) => { if (r.address) { setContract(r.address); setTimeout(() => window.location.assign(`${window.location.pathname}#/assembly`), 1200); setTimeout(() => window.location.reload(), 1300); } },
    nextTo: '/assembly', nextLabel: 'Open the assembly',
  });

  return (
    <div className="container page narrow">
      <PageHead eyebrow="Deploy" title="Start your own assembly" lead="Deploys contracts/Ratchet.py from this page. You and the founders you list become the roster; the charter you write is article one." />
      <div className="card form">
        <Field label="Assembly name" error={e.name}><input className="input" value={name} onChange={(ev) => setName(ev.target.value)} /></Field>
        <Field label="Founders" error={e.founders} hint="One address per line. Your connected account is added automatically."><textarea className="input mono" rows={4} value={founders} onChange={(ev) => setFounders(ev.target.value)} placeholder={'0x…\n0x…'} spellCheck={false} /></Field>
        <div className="grid-3">
          <Field label="Bond (GEN)" error={e.bond} hint="Attached exactly when filing."><input className="input" value={bond} onChange={(ev) => setBond(ev.target.value)} /></Field>
          <Field label="Vote window (min)" error={e.win}><input className="input" type="number" min="2" value={vm} onChange={(ev) => setVm(+ev.target.value)} /></Field>
          <Field label="Challenge window (min)"><input className="input" type="number" min="2" value={cm} onChange={(ev) => setCm(+ev.target.value)} /></Field>
        </div>
        <div>
          <div className="row between"><span className="label">Charter</span><div className="row gap-sm"><Button size="sm" variant="quiet" onClick={() => setArts(EXAMPLE)}>Load example</Button><Button size="sm" variant="ghost" disabled={arts.length >= 12} onClick={() => setArts((l) => [...l, { id: `A${l.length + 1}`, tier: 1, text: '' }])}>＋ Article</Button></div></div>
          <div className="art-rows">
            {arts.map((x, i) => (
              <div key={i} className="art-row">
                <input className="input mono" value={x.id} maxLength={12} onChange={(ev) => upd(i, 'id', ev.target.value.toUpperCase())} />
                <select className="input" value={x.tier} onChange={(ev) => upd(i, 'tier', +ev.target.value)}>{[1, 2, 3, 4].map((t) => <option key={t} value={t}>T{t} {TIERS[t].short}</option>)}</select>
                <input className="input" value={x.text} onChange={(ev) => upd(i, 'text', ev.target.value)} placeholder="Article text" />
                <button className="icon-btn" onClick={() => setArts((l) => l.filter((_, j) => j !== i))} aria-label="Remove">×</button>
              </div>
            ))}
          </div>
          {e.arts && <span className="err">{e.arts}</span>}
        </div>
        <p className="hint">Parameters are fixed at deployment: the contract has no owner, no admin and no upgrade path. Bond {bw ? fmtGen(bw) : '—'} GEN · {list.length} founders.</p>
        <div className="row gap-sm wrap">
          <Button size="lg" disabled={bad} onClick={w.connected ? go : w.openModal}>{w.connected ? 'Deploy assembly' : 'Connect wallet'}</Button>
          <Button as={Link} to="/docs/frontend" variant="ghost" size="lg">How this works</Button>
        </div>
      </div>
    </div>
  );
}
