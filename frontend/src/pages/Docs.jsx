import { Link, Navigate, useParams } from 'react-router-dom';
import { DOCS } from '../content/docs.jsx';
import { Crumbs } from '../components/ui.jsx';

export default function Docs() {
  const { slug } = useParams();
  if (!slug) return <Navigate to="/docs/introduction" replace />;
  const i = DOCS.findIndex((d) => d.slug === slug);
  if (i < 0) return <Navigate to="/docs/introduction" replace />;
  const doc = DOCS[i]; const groups = [...new Set(DOCS.map((d) => d.group))];
  return (
    <div className="container docs">
      <aside className="docs-nav">
        {groups.map((g) => (
          <div key={g}><h4>{g}</h4>{DOCS.filter((d) => d.group === g).map((d) => <Link key={d.slug} to={`/docs/${d.slug}`} className={d.slug === slug ? 'active' : ''}>{d.title}</Link>)}</div>
        ))}
      </aside>
      <article className="docs-body">
        <Crumbs items={[{ to: '/docs', label: 'Docs' }, { label: doc.group }, { label: doc.title }]} />
        <h1>{doc.title}</h1>
        {doc.body()}
        <div className="docs-pager">
          {DOCS[i - 1] ? <Link to={`/docs/${DOCS[i - 1].slug}`}>← {DOCS[i - 1].title}</Link> : <span />}
          {DOCS[i + 1] ? <Link to={`/docs/${DOCS[i + 1].slug}`}>{DOCS[i + 1].title} →</Link> : <span />}
        </div>
      </article>
    </div>
  );
}
