import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAssembly, useMotion, useMyVote } from '../lib/api.js';
import { nowSec } from '../lib/clock.js';
import { fmtDate, fmtGen, sameAddr } from '../lib/format.js';
import { KINDS, STATUS, TIERS, threshold, voteCloseState } from '../lib/rules.js';
import { useWallet } from '../lib/wallet.jsx';
import { AddressChip, Button, Countdown, Crumbs, ErrorCard, Gen, KindBadge, StatusBadge, TierBadge } from '../components/ui.jsx';
import { Lifecycle } from '../components/Visuals.jsx';
import { RatchetSpinner } from '../components/Spinners.jsx';
import { useTx } from '../components/Tx.jsx';

function Detail({ m }) {
  const d = m.detail;
  if (m.kind === 'AMEND') return (
    <dl className="kv">
      <dt>Action</dt><dd><b>{d.action}</b> article <span className="mono">{d.article_id}</span></dd>
      {d.action !== 'REPEAL' && <><dt>New text</dt><dd className="quote">{d.new_text}</dd><dt>New tier</dt><dd><TierBadge tier={d.new_tier} full /></dd></>}
    </dl>
  );
  if (m.kind === 'GRANT') return (
    <dl className="kv"><dt>Recipient</dt><dd><AddressChip address={d.recipient} /></dd><dt>Amount</dt><dd><Gen wei={d.amount} /></dd>
      <dt>Treasury at filing</dt><dd><Gen wei={d.treasury_at_filing} /></dd><dt>Purpose</dt><dd className="quote">{m.text}</dd></dl>
  );
  if (m.kind === 'ADMIT') return <dl className="kv"><dt>Candidate</dt><dd><AddressChip address={d.candidate} /></dd><dt>Statement</dt><dd className="quote">{m.text}</dd></dl>;
  return <dl className="kv"><dt>Member to remove</dt><dd><AddressChip address={d.member} /></dd><dt>Grounds</dt><dd className="quote">{m.text}</dd></dl>;
}

function Touches({ m }) {
  if (!m.touches) return <p className="muted">Not classified yet. When a member runs <b>classify</b>, validators decide, article by article, whether this motion touches it.</p>;
  const target = m.kind === 'AMEND' ? m.detail.article_id : null;
  const others = m.articles.filter((a) => a.id !== target);
  const ch = m.challenge;
  return (
    <>
      {others.length === 0 ? <p className="muted">No other article exists, so no AI call was needed. The floor tier applies.</p> : (
        <table className="table small">
          <thead><tr><th>Article</th><th>Tier</th><th>Strict reading</th>{ch && <th>Challenge</th>}<th>Counts</th></tr></thead>
          <tbody>
            {others.map((a) => {
              const strict = ch ? null : m.touches[a.id]; const chT = ch?.touches?.[a.id];
              const final = m.touches[a.id];
              return (
                <tr key={a.id} className={final ? 'touched' : ''}>
                  <td><b className="mono">{a.id}</b><span className="muted small-text">{a.text.length > 70 ? `${a.text.slice(0, 70)}…` : a.text}</span></td>
                  <td><TierBadge tier={a.tier} /></td>
                  <td>{ch ? (final && !chT ? 'touched' : final && chT ? '—' : 'not touched') : (strict ? <b className="yes">touched</b> : 'not touched')}</td>
                  {ch && <td>{chT ? <b className="yes">touched</b> : 'not touched'}</td>}
                  <td>{final ? <b className="yes">touches</b> : <span className="muted">no</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {m.reason && <p className="clerk"><i>Clerk (strict):</i> {m.reason}</p>}
      {ch && <div className={`challenge-box ${ch.raised ? 'raised' : 'upheld'}`}>
        <b>{ch.raised ? 'Challenge succeeded: the tier ratcheted up' : 'Challenge failed: the tier stayed'}</b>
        <span>Tier {ch.tier_before} → {ch.tier_after}. Challenger <AddressChip address={ch.by} />.</span>
        <p className="clerk"><i>Clerk (inclusive):</i> {ch.reason}</p>
      </div>}
    </>
  );
}

function VoteBar({ m }) {
  const n = m.roster.length; const need = m.votes_needed ?? threshold(m.tier || m.floor_tier, n);
  const rest = n - m.yes - m.no;
  return (
    <div className="votebar">
      <div className="vb-track">
        {Array.from({ length: n }).map((_, i) => <i key={i} className={i < m.yes ? 'y' : i < m.yes + m.no ? 'n' : ''} />)}
        <span className="vb-need" style={{ left: `${((need - 0.5) / n) * 100}%` }}><em>need {need}</em></span>
      </div>
      <div className="vb-legend"><span><i className="y" />{m.yes} yes</span><span><i className="n" />{m.no} no</span><span><i />{rest} not voted</span><span className="muted">{need} of {n} needed</span></div>
    </div>
  );
}

function Action({ title, text, children, why, tone }) {
  return (
    <div className={`action card ${why ? 'off' : ''} ${tone ?? ''}`}>
      <div><h4>{title}</h4><p>{text}</p>{why && <p className="why">⚠ {why}</p>}</div>
      <div className="row gap-sm wrap">{children}</div>
    </div>
  );
}

export default function MotionDetail() {
  const { id } = useParams();
  const mo = useMotion(id); const m = mo.data;
  const a = useAssembly(); const w = useWallet(); const tx = useTx();
  const me = w.account?.toLowerCase();
  const myVote = useMyVote(m ? id : null, w.account);
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(i); }, []);

  if (mo.error && !m) return <div className="container page"><Crumbs items={[{ to: '/motions', label: 'Motions' }, { label: `#${id}` }]} /><ErrorCard title="Motion not found" error={mo.error} onRetry={mo.refetch} /></div>;
  if (!m) return <div className="container page center-fill"><RatchetSpinner size={90} label="Reading the motion…" /></div>;

  const now = nowSec(); const mid = BigInt(m.id);
  const isMember = a.data?.members?.some((x) => sameAddr(x, w.account));
  const onRoster = !!me && m.roster.includes(me);
  const isProposer = !!me && sameAddr(m.proposer, me);
  const voted = myVote.data && myVote.data !== 'NONE' ? myVote.data : null;
  const close = voteCloseState(m, now);
  const bond = BigInt(m.bond);
  const connectHint = !w.connected ? 'Connect a wallet to act.' : null;
  const run = (title, fn, args, extra = {}) => tx.run({ title, fn, args, ...extra });

  const settled = ['ENACTED', 'REJECTED', 'LAPSED', 'VOID', 'WITHDRAWN', 'EXPIRED'].includes(m.status);
  const tierNow = m.tier || m.floor_tier;

  return (
    <div className="container page">
      <Crumbs items={[{ to: '/motions', label: 'Motions' }, { label: `#${m.id}` }]} />
      <header className="motion-head">
        <div>
          <div className="row gap-sm wrap"><KindBadge kind={m.kind} /><StatusBadge status={m.status} /><TierBadge tier={tierNow} full /></div>
          <h1>Motion #{m.id}</h1>
          <p className="muted">{STATUS[m.status]?.desc} Filed by <AddressChip address={m.proposer} /> on {fmtDate(m.filed_at)}.</p>
        </div>
        <div className="motion-clock card">
          {m.status === 'FILED' && <><span>Stale in</span><Countdown to={m.stale_at} now={nowSec} done="stale: can expire" /></>}
          {m.status === 'VOTING' && <><span>Voting closes in</span><Countdown to={m.vote_deadline} now={nowSec} done="closed" /></>}
          {m.status === 'CONTESTABLE' && <><span>{m.challenge ? 'Challenged' : 'Challenge window'}</span>{m.challenge ? <b>ready to finalize</b> : <Countdown to={m.contest_deadline} now={nowSec} done="closed" />}</>}
          {settled && <><span>Settled</span><b>{fmtDate(m.settled_at)}</b></>}
        </div>
      </header>

      <div className="card"><Lifecycle status={m.status} /></div>

      <div className="grid-2 top">
        <div className="stack">
          <div className="card"><h3>What is proposed</h3><Detail m={m} /></div>
          <div className="card"><h3>What it touches</h3><Touches m={m} /></div>
        </div>
        <div className="stack">
          <div className="card">
            <h3>How many votes</h3>
            <div className="tier-calc">
              <div><span>Floor</span><TierBadge tier={m.floor_tier} /></div><i>→</i>
              <div><span>Most entrenched touched</span>{m.touches ? <TierBadge tier={Math.max(m.floor_tier, ...m.articles.filter((x) => m.touches[x.id]).map((x) => x.tier))} /> : <span className="muted">—</span>}</div><i>→</i>
              <div><span>Effective</span><TierBadge tier={tierNow} full /></div>
            </div>
            <p className="muted">{TIERS[tierNow]?.name}: {TIERS[tierNow]?.frac} of the frozen roster of {m.roster.length}.</p>
            <VoteBar m={m} />
            {w.connected && onRoster && <p className="hint">Your vote: <b>{voted ?? (myVote.loading ? '…' : 'not cast yet')}</b></p>}
          </div>
          <div className="card">
            <h3>Money</h3>
            <dl className="kv">
              <dt>Bond</dt><dd><Gen wei={m.bond} /></dd>
              <dt>Still in escrow</dt><dd><Gen wei={m.bond_left} /></dd>
              {m.outcome && <><dt>Outcome</dt><dd><StatusBadge status={m.outcome} /></dd></>}
            </dl>
            <p className="hint">Enacted, rejected, void, withdrawn or expired: the bond returns. Lapsed: it goes to the treasury. A successful challenge pays half of it to the challenger.</p>
          </div>
        </div>
      </div>

      {!settled && (
        <section className="actions">
          <h2>What you can do</h2>
          {m.status === 'FILED' && <>
            <Action title="Classify (AI consensus)" text="Validators decide which articles this motion touches. Strict reading. This opens the vote." why={connectHint ?? (!isMember ? 'Only members can classify.' : null)}>
              <Button onClick={() => run(`Classify motion #${m.id}`, 'classify', [mid], { ai: true, successTitle: 'Classified', successText: 'The validators agreed exactly. The vote is open.' })}>Classify</Button>
            </Action>
            <Action title="Withdraw" text="Pull your motion before it is classified and get the bond back." why={connectHint ?? (!isProposer ? 'Only the proposer can withdraw.' : null)}>
              <Button variant="ghost" onClick={() => run(`Withdraw motion #${m.id}`, 'withdraw_motion', [mid], { successTitle: 'Withdrawn' })}>Withdraw</Button>
            </Action>
            <Action title="Expire" text="Anyone can free the floor once a motion has gone stale unclassified." why={now < m.stale_at ? 'Not stale yet.' : null}>
              <Button variant="ghost" onClick={() => run(`Expire motion #${m.id}`, 'expire_motion', [mid], { successTitle: 'Expired' })}>Expire</Button>
            </Action>
          </>}
          {m.status === 'VOTING' && <>
            <Action title="Cast your vote" text="Frozen-roster members vote once, yes or no." why={connectHint ?? (!onRoster ? 'You were not on the roster when this was filed.' : voted ? `You already voted ${voted}.` : now >= m.vote_deadline ? 'The voting deadline has passed.' : null)}>
              <Button onClick={() => run(`Vote YES on #${m.id}`, 'vote', [mid, true], { successTitle: 'Vote recorded', successText: 'You voted YES.' })}>Vote yes</Button>
              <Button variant="danger" onClick={() => run(`Vote NO on #${m.id}`, 'vote', [mid, false], { successTitle: 'Vote recorded', successText: 'You voted NO.' })}>Vote no</Button>
            </Action>
            <Action title="Close the vote" text="Anyone can close it once everyone voted, the deadline passed, or it cannot pass any more." why={close.can ? null : close.why}>
              <Button variant="dark" onClick={() => run(`Close the vote on #${m.id}`, 'close_vote', [mid], { successTitle: 'Vote closed' })}>Close vote</Button>
            </Action>
          </>}
          {m.status === 'CONTESTABLE' && <>
            <Action title="Challenge (the ratchet)" text={`Re-read it with the inclusive reading. If it raises the tier you win your bond back plus half of the proposer's bond. If not, you lose half of yours. Attaches ${fmtGen(bond)} GEN.`}
              why={connectHint ?? (m.challenge ? 'Already challenged (once per motion).' : now > m.contest_deadline ? 'The challenge window has closed.' : !onRoster ? 'Only roster members can challenge.' : isProposer ? 'A proposer cannot challenge their own motion.' : null)}>
              <Button variant="primary" onClick={() => run(`Challenge motion #${m.id}`, 'challenge', [mid], { ai: true, value: bond, successTitle: 'Challenge resolved', successText: 'The validators agreed exactly on the inclusive reading.' })}>Challenge · {fmtGen(bond)} GEN</Button>
            </Action>
            <Action title="Finalize" text="Settle it: enacted if it still meets the (possibly higher) threshold." why={m.challenge || now > m.contest_deadline ? null : 'The challenge window is still open.'}>
              <Button variant="dark" onClick={() => run(`Finalize motion #${m.id}`, 'finalize', [mid], { successTitle: 'Settled' })}>Finalize</Button>
            </Action>
          </>}
        </section>
      )}

      <details className="card evidence">
        <summary>Frozen evidence</summary>
        <p className="muted">The charter and roster are frozen when a motion is filed. A SHA-256 digest of the evidence is checked before every AI assessment.</p>
        <p className="mono wrap-any small-text">digest {m.digest}</p>
        <ul className="roster">{m.roster.map((r) => <li key={r}><AddressChip address={r} />{m.proposer === r && <span className="badge badge-info">proposer</span>}</li>)}</ul>
        <table className="table small"><tbody>{m.articles.map((x) => <tr key={x.id}><td className="mono"><b>{x.id}</b></td><td><TierBadge tier={x.tier} /></td><td>{x.text}</td></tr>)}</tbody></table>
      </details>
      <div style={{ marginTop: 16 }}><Link className="linklike" to="/motions">← All motions</Link>{' '}<Link className="linklike" to={`/motions/${Math.min(+m.id + 1, a.data?.motion_count ?? +m.id)}`}>Next →</Link></div>
    </div>
  );
}
