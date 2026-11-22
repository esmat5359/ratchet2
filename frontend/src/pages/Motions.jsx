import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAssembly, useMotionList } from '../lib/api.js';
import { LIMITS, FINAL_STATES } from '../lib/rules.js';
import { AddressChip, Button, ErrorCard, KindBadge, PageHead, Segmented, StatusBadge, TierBadge } from '../components/ui.jsx';
import { MochiSays } from '../components/Mochi.jsx';
import { Skeleton } from '../components/Spinners.jsx';

export default function Motions() {
  const a = useAssembly(); const total = a.data?.motion_count;
  const [page, setPage] = useState(0); const [f, setF] = useState('all');
  const list = useMotionList(total, page);
  const rows = (list.data?.motions ?? []).filter((m) => (f === 'all' ? true : f === 'active' ? !FINAL_STATES.includes(m.status) : FINAL_STATES.includes(m.status)));
  const pages = total ? Math.ceil(total / LIMITS.PAGE) : 1;
  if (a.error && !a.data) return <div className="container page"><PageHead eyebrow="Motions" title="Motions" /><ErrorCard error={a.error} onRetry={a.refetch} /></div>;
  return (
    <div className="container page">
      <PageHead eyebrow="Motions" title="Every motion, newest first" lead="One motion at a time holds the floor. Open one to vote, classify, challenge or finalize.">
        <Button as={Link} to="/file" size="sm">File a motion</Button>
      </PageHead>
      <div className="row between wrap gap-sm" style={{ marginBottom: 14 }}>
        <Segmented value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'done', label: 'Settled' }]} />
        <span className="muted">{total ?? '—'} filed in total</span>
      </div>
      <div className="table-wrap card flush">
        <table className="table motions">
          <thead><tr><th>#</th><th>Kind</th><th>Status</th><th>Tier</th><th>Votes</th><th>Proposer</th><th /></tr></thead>
          <tbody>
            {list.loading && [0, 1, 2].map((i) => <tr key={i}><td colSpan={7}><Skeleton h={22} /></td></tr>)}
            {rows.map((m) => (
              <tr key={m.id}>
                <td><Link to={`/motions/${m.id}`} className="mono"><b>#{m.id}</b></Link></td>
                <td><KindBadge kind={m.kind} /></td><td><StatusBadge status={m.status} /></td>
                <td>{m.tier ? <TierBadge tier={m.tier} /> : <span className="muted">—</span>}</td>
                <td className="mono">{m.yes} yes · {m.no} no</td>
                <td><AddressChip address={m.proposer} link={false} /></td>
                <td><Link className="linklike" to={`/motions/${m.id}`}>Open →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.loading && rows.length === 0 && (
          <div style={{ padding: 24 }}><MochiSays title="Nothing here yet" size={120}>{total === 0 ? 'No motion has been filed on this assembly.' : 'No motion matches this filter on this page.'}</MochiSays></div>
        )}
      </div>
      {pages > 1 && (
        <div className="row gap-sm center" style={{ marginTop: 16 }}>
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>← Newer</Button>
          <span className="muted">Page {page + 1} of {pages}</span>
          <Button variant="ghost" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Older →</Button>
        </div>
      )}
    </div>
  );
}
