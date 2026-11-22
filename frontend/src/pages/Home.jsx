import { lazy, Suspense, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LINKS, explorerAddress, getContract } from '../lib/config.js';
import { useAssembly, useMotionList } from '../lib/api.js';
import { fmtGen, shortAddr } from '../lib/format.js';
import { KINDS, TIERS, threshold } from '../lib/rules.js';
import { VIDEO } from '../content/video.js';
import { Button, Gen, KindBadge, StatusBadge, TierBadge } from '../components/ui.jsx';
import { Mochi } from '../components/Mochi.jsx';
import { Tilt } from '../components/Tilt.jsx';
import { ConsensusDuel, Tier3D } from '../components/Visuals.jsx';
import { RatchetSpinner } from '../components/Spinners.jsx';
import { LogoMark } from '../components/Logo.jsx';
import { useToast } from '../lib/toast.jsx';

const Gear3D = lazy(() => import('../components/Gear3D.jsx'));
const base = import.meta.env.BASE_URL;

const STEPS = [
  ['01', 'File', 'A member escrows an exact bond and files a motion: amend the charter, spend funds, admit or expel.', '✎'],
  ['02', 'Classify', 'Validators ask an LLM which articles the motion touches. They must answer identically.', '◎'],
  ['03', 'Vote', 'The frozen roster votes. The needed share depends on the most entrenched article touched.', '✓'],
  ['04', 'Challenge', 'Any member can re-read it with an inclusive eye. The tier can only go up, never down.', '↑'],
  ['05', 'Finalize', 'Enacted, rejected or void. Bonds, bounties and grants settle as pull payments.', '⚖'],
];

function Hero() {
  const a = useAssembly();
  const d = a.data;
  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true" style={{ backgroundImage: `url(${base}brand/hero-bg.webp)` }} />
      <div className="container hero-in">
        <div className="hero-copy">
          <span className="chip chip-glow"><i className="live-dot" /> Live on GenLayer Studionet</span>
          <h1>A constitution that <em>only tightens.</em></h1>
          <p>
            Ratchet lets a small assembly govern itself with a written charter of tiered articles.
            GenLayer validators judge what a motion <i>means</i>, reproduce each other’s answers <b>exactly</b>,
            and the bar for change can be ratcheted up but never down.
          </p>
          <div className="row gap-sm wrap">
            <Button as={Link} to="/assembly" size="lg">Open the assembly</Button>
            <Button as={Link} to="/#demo" variant="glass" size="lg">▶ Watch the demo</Button>
            <Button as={Link} to="/docs" variant="glass" size="lg">Read the docs</Button>
          </div>
          <div className="hero-stats">
            <Tilt className="hs"><span>Members</span><b>{d?.member_count ?? '—'}</b></Tilt>
            <Tilt className="hs"><span>Treasury</span><b>{d ? <>{fmtGen(d.treasury, 4)}<small> GEN</small></> : '—'}</b></Tilt>
            <Tilt className="hs"><span>Motions</span><b>{d?.motion_count ?? '—'}</b></Tilt>
            <Tilt className="hs"><span>Charter v</span><b>{d?.charter_version ?? '—'}</b></Tilt>
          </div>
        </div>
      </div>
    </section>
  );
}

function Feel() {
  const [tier, setTier] = useState(1);
  const [roster, setRoster] = useState(5);
  const [blocked, setBlocked] = useState(0);
  const toast = useToast();
  const tighten = () => { if (tier < 4) setTier(tier + 1); else toast.push({ tone: 'info', text: 'Tier 4 is the ceiling: foundational means unanimity.' }); };
  const loosen = () => { setBlocked((b) => b + 1); toast.push({ tone: 'warn', title: 'The pawl holds', text: 'A challenge can only add touched articles. Tiers never ratchet down.' }); };
  const need = threshold(tier, roster);
  return (
    <section className="section feel">
      <div className="container feel-grid">
        <div className="feel-3d card-glass">
          <Suspense fallback={<div className="center-fill"><RatchetSpinner size={90} label="Loading 3D…" /></div>}>
            <Gear3D steps={tier - 1} blockedKey={blocked} />
          </Suspense>
          <div className="feel-hint">Move your pointer · the wheel only turns one way</div>
        </div>
        <div className="feel-ctl">
          <div className="eyebrow">Feel the ratchet</div>
          <h2>Raise the tier. Try to lower it.</h2>
          <p className="lead">Every motion starts at a floor and climbs to the tier of the most entrenched article it touches. Challenges can add touched articles, so the tier clicks up one notch and the pawl never lets it back.</p>
          <div className="need card">
            <div className="need-top"><TierBadge tier={tier} full /><span className="muted">{TIERS[tier].frac}</span></div>
            <div className="need-num"><b>{need}</b><span>of {roster} votes needed</span></div>
            <label className="range"><span>Roster size <b>{roster}</b></span>
              <input type="range" min="3" max="15" value={roster} onChange={(e) => setRoster(+e.target.value)} />
            </label>
            <div className="row gap-sm wrap">
              <Button onClick={tighten} icon="↻">Tighten</Button>
              <Button variant="ghost" onClick={loosen}>Loosen</Button>
              <Button variant="quiet" onClick={() => setTier(1)}>Reset</Button>
            </div>
          </div>
          <Tier3D tier={tier} roster={roster} onPick={setTier} compact />
        </div>
      </div>
    </section>
  );
}

function VideoSection() {
  const ref = useRef(null); const [playing, setPlaying] = useState(false);
  const seek = (t) => { setPlaying(true); setTimeout(() => { const v = ref.current; if (v) { v.currentTime = t; v.play().catch(() => {}); } }, 60); };
  return (
    <section className="section" id="demo">
      <div className="container">
        <div className="section-head"><div className="eyebrow">Demo video</div><h2>See a motion travel from filing to settlement</h2>
          <p className="lead">A walkthrough of the real interface: connecting through EIP-6963, switching to Studionet, filing, AI classification, voting, a challenge that ratchets the tier, and settlement.</p></div>
        <div className="video-grid">
          <div className="video-frame card-glass">
            {!playing ? (
              <button className="video-poster" onClick={() => setPlaying(true)} aria-label="Play the demo video" style={{ backgroundImage: `url(${base}${VIDEO.poster})` }}>
                <span className="play"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="23" /><path d="M19 15l16 9-16 9z" /></svg></span>
                <span className="video-cap">Play demo · 3 min</span>
              </button>
            ) : (
              <video ref={ref} poster={`${base}${VIDEO.poster}`} controls autoPlay playsInline preload="metadata"><source src={`${base}${VIDEO.webm}`} type="video/webm" /><source src={`${base}${VIDEO.src}`} type="video/mp4" /></video>
            )}
          </div>
          <ol className="chapters">
            {VIDEO.chapters.map((c, i) => (
              <li key={c.t}><button onClick={() => seek(c.t)}><span className="mono">{String(Math.floor(c.t / 60)).padStart(1, '0')}:{String(c.t % 60).padStart(2, '0')}</span><b>{c.title}</b><i>{i + 1}</i></button></li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Recent() {
  const a = useAssembly();
  const list = useMotionList(a.data?.motion_count, 0);
  const rows = (list.data?.motions ?? []).slice(0, 4);
  return (
    <section className="section">
      <div className="container split">
        <div>
          <div className="eyebrow">On the floor</div>
          <h2>Latest motions</h2>
          {a.data && a.data.motion_count === 0 && <p className="muted">No motion has been filed yet. Members can file the first one.</p>}
          <div className="recent">
            {rows.map((m) => (
              <Link key={m.id} to={`/motions/${m.id}`} className="recent-row card">
                <b>#{m.id}</b><KindBadge kind={m.kind} /><StatusBadge status={m.status} />
                {m.tier ? <TierBadge tier={m.tier} /> : <span />}
                <span className="mono muted">{m.yes}–{m.no}</span><i>→</i>
              </Link>
            ))}
            {list.loading && <div className="card"><RatchetSpinner size={40} label="Reading the chain…" /></div>}
          </div>
          <Button as={Link} to="/motions" variant="ghost" style={{ marginTop: 14 }}>All motions</Button>
        </div>
        <Tilt className="contract-card card-glass">
          <LogoMark size={64} animate />
          <h3>{a.data?.name ?? 'Ratchet assembly'}</h3>
          <dl>
            <dt>Contract</dt><dd><a className="mono" href={explorerAddress(getContract())} target="_blank" rel="noreferrer">{shortAddr(getContract(), 8, 6)} ↗</a></dd>
            <dt>Network</dt><dd>GenLayer Studionet</dd>
            <dt>Bond</dt><dd>{a.data ? <Gen wei={a.data.bond} /> : '—'}</dd>
            <dt>Windows</dt><dd>{a.data ? `${a.data.vote_minutes} min vote · ${a.data.challenge_minutes} min challenge` : '—'}</dd>
          </dl>
          <Button as={Link} to="/assembly" variant="dark" size="sm">Assembly dashboard</Button>
        </Tilt>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <section className="section">
        <div className="container">
          <div className="section-head"><div className="eyebrow">How it works</div><h2>Five steps from idea to law</h2></div>
          <div className="steps">
            {STEPS.map(([n, t, d, g]) => (
              <Tilt key={n} className="step card"><span className="step-n">{n}</span><span className="step-g">{g}</span><h3>{t}</h3><p>{d}</p></Tilt>
            ))}
          </div>
          <div className="kinds">{Object.entries(KINDS).map(([k, v]) => <div key={k} className="kind card"><i>{v.glyph}</i><div><b>{v.label}</b><span>{v.blurb}</span></div></div>)}</div>
        </div>
      </section>
      <Feel />
      <section className="section">
        <div className="container split">
          <div>
            <div className="eyebrow">The validator rule</div>
            <h2>Exactly equal, or nothing happens</h2>
            <p className="lead">Statuses, booleans and levels that decide a path or a payout must match <b>exactly</b> between the leader and every validator. There is no “one level off” tolerance. Only the free-text reason may differ.</p>
            <ul className="ticks">
              <li>Validators assess independently and never see the leader’s answer.</li>
              <li>The tier is computed from the booleans in code, never by the LLM.</li>
              <li>No consensus means no state change. The caller simply retries.</li>
            </ul>
            <Button as={Link} to="/docs/consensus" variant="ghost">Read the consensus notes</Button>
          </div>
          <ConsensusDuel />
        </div>
      </section>
      <VideoSection />
      <Recent />
      <section className="cta">
        <div className="cta-bg" aria-hidden="true" style={{ backgroundImage: `url(${base}brand/hero-bg-sm.webp)` }} />
        <div className="container cta-in">
          <Mochi size={230} />
          <div>
            <h2>Govern a small assembly. Properly.</h2>
            <p>Connect a wallet, read the charter and file your first motion, or deploy a fresh assembly of your own from the browser.</p>
            <div className="row gap-sm wrap">
              <Button as={Link} to="/file" size="lg">File a motion</Button>
              <Button as={Link} to="/deploy" variant="glass" size="lg">Deploy your own</Button>
              <Button as="a" href={LINKS.github} target="_blank" rel="noreferrer" variant="glass" size="lg">GitHub ↗</Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
