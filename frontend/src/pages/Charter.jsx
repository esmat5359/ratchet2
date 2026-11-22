import { Link } from 'react-router-dom';
import { useAssembly, useCharter } from '../lib/api.js';
import { TIERS, threshold } from '../lib/rules.js';
import { Button, ErrorCard, PageHead, TierBadge } from '../components/ui.jsx';
import { Skeleton } from '../components/Spinners.jsx';
import { Tier3D } from '../components/Visuals.jsx';
import { Tilt } from '../components/Tilt.jsx';
import { useState } from 'react';

export default function Charter() {
  const c = useCharter(); const a = useAssembly();
  const n = a.data?.member_count ?? 5;
  const [sel, setSel] = useState(null);
  const arts = [...(c.data?.articles ?? [])].sort((x, y) => y.tier - x.tier || (x.id < y.id ? -1 : 1));
  if (c.error && !c.data) return <div className="container page"><PageHead eyebrow="Charter" title="Charter" /><ErrorCard error={c.error} onRetry={c.refetch} /></div>;
  return (
    <div className="container page">
      <PageHead eyebrow="Charter" title="The written rules" lead="Articles are tiered. The more entrenched an article, the larger the majority needed to touch it, and a motion pays for the most entrenched article it affects.">
        {c.data && <span className="badge badge-info">version {c.data.version}</span>}
        <Button as={Link} to="/file?kind=AMEND" size="sm">Propose an amendment</Button>
      </PageHead>
      <div className="charter-layout">
        <div className="articles">
          {!c.data && [0, 1, 2, 3].map((i) => <div key={i} className="card"><Skeleton h={18} w="40%" /><Skeleton h={14} style={{ marginTop: 12 }} /><Skeleton h={14} w="70%" style={{ marginTop: 8 }} /></div>)}
          {arts.map((x) => (
            <Tilt key={x.id} className={`article card ${sel === x.tier ? 'hl' : ''}`} max={4} style={{ '--c': TIERS[x.tier].color }}>
              <div className="article-top"><span className="article-id mono">{x.id}</span><TierBadge tier={x.tier} full /><span className="spacer" /><span className="muted need-chip">{threshold(x.tier, n)}/{n} votes</span></div>
              <p>{x.text}</p>
              <div className="row gap-sm wrap"><Link className="linklike" to={`/file?kind=AMEND&article=${x.id}`}>Amend</Link><Link className="linklike" to={`/file?kind=AMEND&article=${x.id}&repeal=1`}>Repeal</Link></div>
            </Tilt>
          ))}
          {c.data && arts.length === 0 && <div className="card muted">The charter is empty. A motion can adopt the first article.</div>}
        </div>
        <aside className="charter-side">
          <div className="card">
            <h3>Votes needed</h3>
            <p className="muted">For the current roster of <b>{n}</b>. Click a block to highlight its articles.</p>
            <Tier3D tier={sel ?? 4} roster={n} onPick={(t) => setSel(sel === t ? null : t)} />
          </div>
          <div className="card">
            <h3>The tier ladder</h3>
            <table className="table small"><tbody>
              {[1, 2, 3, 4].map((t) => <tr key={t}><td><TierBadge tier={t} /></td><td>{TIERS[t].name}</td><td className="mono">{TIERS[t].sym}</td><td className="mono"><b>{threshold(t, n)}</b>/{n}</td></tr>)}
            </tbody></table>
          </div>
        </aside>
      </div>
    </div>
  );
}
