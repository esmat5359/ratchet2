import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAssembly, useClaimable, useLedger, useStanding, refreshAll } from '../lib/api.js';
import { explorerAddress, getContract } from '../lib/config.js';
import { fmtGen, parseGen, sameAddr } from '../lib/format.js';
import { useWallet } from '../lib/wallet.jsx';
import { AddressChip, Button, ErrorCard, Field, Gen, PageHead, Stat } from '../components/ui.jsx';
import { useTx } from '../components/Tx.jsx';
import { Skeleton } from '../components/Spinners.jsx';
import { MochiSays } from '../components/Mochi.jsx';
import { Tilt } from '../components/Tilt.jsx';

function Ledger() {
  const l = useLedger(); const d = l.data;
  const total = d ? BigInt(d.books) || 1n : 1n;
  const pct = (v) => (d ? Number((BigInt(v) * 1000n) / (total || 1n)) / 10 : 0);
  return (
    <div className="card ledger">
      <div className="row between wrap gap-sm"><h3>Conservation ledger</h3>
        {d && <span className={`badge ${d.solvent ? 'badge-ok' : 'badge-bad'}`}><span className="dot" />{d.solvent ? 'Solvent' : 'Insolvent'}</span>}</div>
      <p className="muted">The contract’s balance must always cover treasury + escrow + everyone’s withdrawable balance.</p>
      {!d ? <Skeleton h={14} /> : (
        <>
          <div className="meter" role="img" aria-label="Share of treasury, escrow and claimable">
            <i style={{ width: `${pct(d.treasury)}%`, background: 'var(--cobalt)' }} /><i style={{ width: `${pct(d.escrow)}%`, background: 'var(--violet)' }} /><i style={{ width: `${pct(d.claimable_total)}%`, background: 'var(--cyan)' }} />
          </div>
          <dl className="kv">
            <dt><i style={{ background: 'var(--cobalt)' }} />Treasury</dt><dd><Gen wei={d.treasury} /></dd>
            <dt><i style={{ background: 'var(--violet)' }} />Escrow (bond on the floor)</dt><dd><Gen wei={d.escrow} /></dd>
            <dt><i style={{ background: 'var(--cyan)' }} />Claimable by people</dt><dd><Gen wei={d.claimable_total} /></dd>
            <dt>Books total</dt><dd><Gen wei={d.books} /></dd>
            <dt>Contract balance</dt><dd><Gen wei={d.balance} /></dd>
          </dl>
        </>
      )}
    </div>
  );
}

function Me({ members }) {
  const w = useWallet(); const tx = useTx();
  const claim = useClaimable(w.account); const st = useStanding(w.account);
  const isMember = members?.some((m) => sameAddr(m, w.account));
  if (!w.connected) return (
    <div className="card"><h3>Your standing</h3><p className="muted">Connect a wallet to see whether you are a member, what you can withdraw and your track record.</p><Button size="sm" onClick={w.openModal}>Connect wallet</Button></div>
  );
  const c = claim.data ?? 0n;
  return (
    <div className="card me">
      <div className="row between wrap gap-sm"><h3>Your standing</h3>{members && <span className={`badge ${isMember ? 'badge-ok' : 'badge-mute'}`}>{isMember ? 'Member' : 'Not a member'}</span>}</div>
      <AddressChip address={w.account} long={false} />
      <div className="me-stats">
        {['filed', 'enacted', 'raised', 'lost'].map((k) => <div key={k}><b>{st.data ? st.data[k] : '–'}</b><span>{({ filed: 'filed', enacted: 'enacted', raised: 'challenges won', lost: 'challenges lost' })[k]}</span></div>)}
      </div>
      <div className="claim">
        <div><span className="muted">Withdrawable</span><b><Gen wei={c} /></b></div>
        <Button size="sm" disabled={c <= 0n} onClick={() => tx.run({ title: 'Withdraw your balance', fn: 'withdraw', successTitle: 'Withdrawal sent', successText: 'The payout is an EVM message and may take a moment to reach your wallet after finalization.' })}>Withdraw</Button>
      </div>
      {!isMember && members && <p className="hint">Only members can file, classify, vote and challenge. Anyone can donate and withdraw.</p>}
    </div>
  );
}

function Donate() {
  const tx = useTx(); const [v, setV] = useState('0.01');
  const wei = parseGen(v);
  return (
    <div className="card">
      <h3>Donate to the commons</h3>
      <p className="muted">Straight into the treasury. It can only be spent by a grant motion.</p>
      <Field label="Amount (GEN)" error={v && (wei === null || wei <= 0n) ? 'Enter a positive amount, up to 18 decimals.' : null}>
        <input className="input" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} />
      </Field>
      <Button disabled={wei === null || wei <= 0n} onClick={() => tx.run({ title: 'Donate to the treasury', fn: 'donate', value: wei, successTitle: 'Thank you', successText: `${v} GEN is now in the commons treasury.` })}>Donate {wei ? `${fmtGen(wei)} GEN` : ''}</Button>
    </div>
  );
}

export default function Assembly() {
  const a = useAssembly(); const d = a.data; const w = useWallet();
  if (a.error && !d) return <div className="container page"><PageHead eyebrow="Assembly" title="Assembly" /><ErrorCard error={a.error} onRetry={a.refetch} /></div>;
  return (
    <div className="container page">
      <PageHead eyebrow="Assembly" title={d?.name ?? 'Assembly'} lead="The roster, the commons treasury and the books of one self-governing assembly.">
        <a className="btn btn-ghost btn-sm" href={explorerAddress(getContract())} target="_blank" rel="noreferrer">Contract on explorer ↗</a>
        <Button size="sm" variant="ghost" onClick={() => { refreshAll(); }} loading={a.refreshing}>Refresh</Button>
      </PageHead>

      <div className="stats">
        <Tilt className="stat-wrap"><Stat label="Treasury" value={d && <Gen wei={d.treasury} />} accent="cobalt" sub="commons funds" /></Tilt>
        <Tilt className="stat-wrap"><Stat label="Members" value={d?.member_count} sub={d && `of ${15} max`} accent="violet" /></Tilt>
        <Tilt className="stat-wrap"><Stat label="Charter" value={d && `v${d.charter_version}`} sub={d && `${d.article_count} articles`} accent="cyan" /></Tilt>
        <Tilt className="stat-wrap"><Stat label="Bond per motion" value={d && <Gen wei={d.bond} />} sub={d && `${d.vote_minutes} min vote · ${d.challenge_minutes} min challenge`} /></Tilt>
      </div>

      {d && (
        <div className={`floor card ${d.floor_motion ? 'busy' : 'free'}`}>
          <span className="floor-dot" />
          <div>{d.floor_motion ? <>Motion <b>#{d.floor_motion}</b> holds the floor. Nobody can file until it settles. <Link to={`/motions/${d.floor_motion}`}>Open it →</Link></> : <>The floor is <b>free</b>. A member can file a motion now. <Link to="/file">File one →</Link></>}</div>
        </div>
      )}

      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <h3>Roster</h3>
            <p className="muted">The roster is frozen into each motion when it is filed.</p>
            {!d ? <Skeleton h={90} /> : <ul className="roster">{d.members.map((m) => <li key={m}><AddressChip address={m} long /></li>)}</ul>}
          </div>
          <div className="card">
            <h3>Track record</h3>
            {!d ? <Skeleton h={70} /> : (
              <div className="record">
                {[['Filed', d.stats.filed], ['Enacted', d.stats.enacted], ['Rejected', d.stats.rejected], ['Lapsed', d.stats.lapsed], ['Void', d.stats.void], ['Tier raised', d.stats.challenges_raised], ['Challenge upheld', d.stats.challenges_upheld]].map(([k, v]) => <div key={k}><b>{v}</b><span>{k}</span></div>)}
              </div>
            )}
          </div>
          <Ledger />
        </div>
        <div className="stack">
          <Me members={d?.members} />
          <Donate />
          {d && !d.members.some((m) => sameAddr(m, w.account)) && (
            <MochiSays title="Want your own assembly?" size={130}>You can deploy a fresh Ratchet assembly from your browser and be its founder.
              <div style={{ marginTop: 10 }}><Button as={Link} to="/deploy" size="sm">Deploy an assembly</Button></div></MochiSays>
          )}
        </div>
      </div>
    </div>
  );
}
