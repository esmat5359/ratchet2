import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAssembly, useCharter } from '../lib/api.js';
import { fmtGen, isAddress, parseGen, sameAddr, utf8Len } from '../lib/format.js';
import { KINDS, LIMITS, TIERS, grantFloor, validArticleId } from '../lib/rules.js';
import { useWallet } from '../lib/wallet.jsx';
import { Button, Field, Gen, PageHead, Segmented, TierBadge } from '../components/ui.jsx';
import { useTx } from '../components/Tx.jsx';
import { MochiSays } from '../components/Mochi.jsx';

const NEW = '__new__';

export default function FileMotion() {
  const [sp, setSp] = useSearchParams();
  const a = useAssembly(); const c = useCharter(); const w = useWallet(); const tx = useTx();
  const kind = KINDS[sp.get('kind')] ? sp.get('kind') : 'AMEND';
  const d = a.data;
  const isMember = !!d && d.members.some((m) => sameAddr(m, w.account));
  const floorBusy = d && d.floor_motion !== 0;

  // AMEND
  const [artSel, setArtSel] = useState(sp.get('article') || NEW);
  const [newId, setNewId] = useState('');
  const [text, setText] = useState('');
  const [tier, setTier] = useState(1);
  const [repeal, setRepeal] = useState(sp.get('repeal') === '1');
  const existing = c.data?.articles.find((x) => x.id === artSel);
  useEffect(() => { if (existing && !text) { setText(existing.text); setTier(existing.tier); } }, [existing?.id]); // eslint-disable-line
  // GRANT / ADMIT / EXPEL
  const [rec, setRec] = useState(''); const [amt, setAmt] = useState(''); const [purpose, setPurpose] = useState('');
  const [cand, setCand] = useState(''); const [stmt, setStmt] = useState('');
  const [mem, setMem] = useState(''); const [grounds, setGrounds] = useState('');

  const bond = d ? BigInt(d.bond) : null;
  const artId = artSel === NEW ? newId.trim() : artSel;
  const v = useMemo(() => {
    const e = {}; let spec = null; let floor = 1;
    if (kind === 'AMEND') {
      if (!validArticleId(artId)) e.id = 'Use 1–12 characters A–Z, 0–9 or _, starting with a letter (e.g. A5, ARCHIVE).';
      if (existing) floor = Math.max(1, existing.tier);
      if (artSel === NEW && c.data && c.data.articles.length >= LIMITS.MAX_ARTICLES) e.id = 'The charter already holds 12 articles.';
      if (repeal && existing) spec = { fn: 'file_amendment', args: [artId, '', 0n], title: `Repeal article ${artId}`, summary: 'Repeal' };
      else {
        const t = text.trim();
        if (!t) e.text = 'Write the article text.'; else if (utf8Len(t) > LIMITS.MAX_TEXT_BYTES) e.text = `At most ${LIMITS.MAX_TEXT_BYTES} bytes (${utf8Len(t)} now).`;
        if (existing && t === existing.text && tier === existing.tier) e.text = 'This changes nothing.';
        spec = { fn: 'file_amendment', args: [artId, t, BigInt(tier)], title: existing ? `Replace article ${artId}` : `Adopt article ${artId}` };
      }
    }
    if (kind === 'GRANT') {
      const wei = parseGen(amt); const t = purpose.trim();
      if (!isAddress(rec)) e.rec = 'Enter a valid 0x address.';
      if (wei === null || wei <= 0n) e.amt = 'Enter a positive amount.'; else if (d && wei > BigInt(d.treasury)) e.amt = `Above the treasury (${fmtGen(d.treasury)} GEN).`;
      if (!t) e.purpose = 'Describe the purpose.'; else if (utf8Len(t) > 500) e.purpose = 'At most 500 bytes.';
      if (wei && d && wei > 0n && wei <= BigInt(d.treasury)) floor = grantFloor(wei, d.treasury);
      spec = { fn: 'file_grant', args: [rec.trim(), wei ?? 0n, t], title: 'File a grant' };
    }
    if (kind === 'ADMIT') {
      const t = stmt.trim();
      if (!isAddress(cand)) e.cand = 'Enter a valid 0x address.'; else if (d?.members.some((m) => sameAddr(m, cand))) e.cand = 'Already a member.';
      if (!t) e.stmt = 'Add a statement.'; else if (utf8Len(t) > 500) e.stmt = 'At most 500 bytes.';
      if (d && d.member_count >= LIMITS.MAX_MEMBERS) e.cand = 'The roster is full (15).';
      floor = 2; spec = { fn: 'file_admission', args: [cand.trim(), t], title: 'Propose a new member' };
    }
    if (kind === 'EXPEL') {
      const t = grounds.trim();
      if (!isAddress(mem)) e.mem = 'Pick a member.';
      if (!t) e.grounds = 'State the grounds.'; else if (utf8Len(t) > 500) e.grounds = 'At most 500 bytes.';
      if (d && d.member_count <= LIMITS.MIN_MEMBERS) e.mem = 'The roster cannot drop below 3.';
      floor = 3; spec = { fn: 'file_expulsion', args: [mem.trim(), t], title: 'Propose an expulsion' };
    }
    return { e, spec, floor };
  }, [kind, artId, artSel, existing, text, tier, repeal, rec, amt, purpose, cand, stmt, mem, grounds, d, c.data]);

  const blockers = [];
  if (!w.connected) blockers.push('Connect a wallet.');
  else if (d && !isMember) blockers.push('Only members can file motions. Your account is not on the roster.');
  if (floorBusy) blockers.push(`Motion #${d.floor_motion} holds the floor.`);
  const invalid = Object.keys(v.e).length > 0;
  const submit = () => tx.run({
    ...v.spec, value: bond, successTitle: 'Motion filed',
    successText: `Your bond of ${fmtGen(bond)} GEN is escrowed. Next, a member runs the AI classification to open the vote.`,
    nextTo: `/motions/${(d?.motion_count ?? 0) + 1}`, nextLabel: 'Open the motion',
  });

  return (
    <div className="container page narrow">
      <PageHead eyebrow="File a motion" title="Put it to the assembly" lead="You attach exactly the bond. It comes back unless the motion lapses; a challenger can win half of it." />
      <Segmented value={kind} onChange={(k) => { const n = new URLSearchParams(sp); n.set('kind', k); setSp(n, { replace: true }); }} options={Object.entries(KINDS).map(([k, x]) => ({ value: k, label: x.label, icon: x.glyph }))} />
      <p className="muted" style={{ margin: '10px 0 18px' }}>{KINDS[kind].blurb}</p>

      <div className="card form">
        {kind === 'AMEND' && <>
          <Field label="Article" hint={existing ? `Currently tier ${existing.tier}: this motion needs at least that tier.` : 'A new id adopts a new article at tier 1 floor.'} error={v.e.id}>
            <select className="input" value={artSel} onChange={(e) => { setArtSel(e.target.value); setText(''); setRepeal(false); }}>
              <option value={NEW}>＋ New article…</option>
              {c.data?.articles.map((x) => <option key={x.id} value={x.id}>{x.id} · tier {x.tier}</option>)}
            </select>
          </Field>
          {artSel === NEW && <Field label="New article id"><input className="input mono" value={newId} placeholder="ARCHIVE" onChange={(e) => setNewId(e.target.value.toUpperCase())} maxLength={12} /></Field>}
          {existing && <label className="check"><input type="checkbox" checked={repeal} onChange={(e) => setRepeal(e.target.checked)} /> Repeal this article instead (needs the article’s own tier)</label>}
          {!repeal && <>
            <Field label="Article text" right={`${utf8Len(text)}/${LIMITS.MAX_TEXT_BYTES} bytes`} error={v.e.text}><textarea className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="The assembly keeps a public archive of its minutes." /></Field>
            <Field label="Tier of this article (how entrenched it will be)"><div className="tier-pick">{[1, 2, 3, 4].map((t) => <button key={t} type="button" className={tier === t ? 'on' : ''} style={{ '--c': TIERS[t].color }} onClick={() => setTier(t)}><b>T{t}</b><span>{TIERS[t].short}</span></button>)}</div></Field>
          </>}
        </>}
        {kind === 'GRANT' && <>
          <Field label="Recipient address" error={v.e.rec}><input className="input mono" value={rec} onChange={(e) => setRec(e.target.value)} placeholder="0x…" spellCheck={false} /></Field>
          <Field label="Amount (GEN)" error={v.e.amt} hint={d && `Treasury: ${fmtGen(d.treasury)} GEN. Up to 10% is tier 1, up to 50% tier 2, more tier 3.`}><input className="input" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.001" /></Field>
          <Field label="Purpose" error={v.e.purpose} right={`${utf8Len(purpose)}/500`}><textarea className="input" rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Pay the hall rental for the spring assembly." /></Field>
        </>}
        {kind === 'ADMIT' && <>
          <Field label="Candidate address" error={v.e.cand}><input className="input mono" value={cand} onChange={(e) => setCand(e.target.value)} placeholder="0x…" spellCheck={false} /></Field>
          <Field label="Statement" error={v.e.stmt} right={`${utf8Len(stmt)}/500`}><textarea className="input" rows={3} value={stmt} onChange={(e) => setStmt(e.target.value)} placeholder="A long-time volunteer who ran every meeting this year." /></Field>
        </>}
        {kind === 'EXPEL' && <>
          <Field label="Member to remove" error={v.e.mem}>
            <select className="input mono" value={mem} onChange={(e) => setMem(e.target.value)}><option value="">Choose…</option>{d?.members.map((m) => <option key={m} value={m}>{m}</option>)}</select>
          </Field>
          <Field label="Grounds" error={v.e.grounds} right={`${utf8Len(grounds)}/500`}><textarea className="input" rows={3} value={grounds} onChange={(e) => setGrounds(e.target.value)} /></Field>
        </>}

        <div className="summary">
          <div><span>Floor tier</span><TierBadge tier={v.floor} full /></div>
          <div><span>Bond (attached exactly)</span><b>{bond != null ? <Gen wei={bond} /> : '—'}</b></div>
          <div><span>Next step</span><b>a member classifies</b></div>
        </div>
        <p className="hint">The AI may raise the tier above this floor if the motion contradicts a more entrenched article.</p>
        {blockers.map((b) => <p key={b} className="err">⚠ {b}</p>)}
        <div className="row gap-sm wrap">
          <Button size="lg" disabled={invalid || !v.spec || (w.connected && blockers.length > 0)} onClick={w.connected ? submit : w.openModal}>{w.connected ? `File ${KINDS[kind].label.toLowerCase()} motion` : 'Connect wallet'}</Button>
          <Button as={Link} to="/motions" variant="ghost" size="lg">Cancel</Button>
        </div>
      </div>
      {w.connected && d && !isMember && <MochiSays title="You are not a member of this assembly" size={120}>You can still read everything, donate and withdraw. To file motions, deploy an assembly of your own, or ask a member to admit you. <div style={{ marginTop: 8 }}><Button as={Link} to="/deploy" size="sm">Deploy your own</Button></div></MochiSays>}
    </div>
  );
}
