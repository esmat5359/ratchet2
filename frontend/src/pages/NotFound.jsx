import { Link } from 'react-router-dom';
import { Button } from '../components/ui.jsx';
import { MochiSays } from '../components/Mochi.jsx';

export default function NotFound() {
  return (
    <div className="container page narrow">
      <MochiSays title="404: this page was never filed" size={200}>
        No motion, article or page lives here. The ratchet only moves forward, so let’s head back.
        <div style={{ marginTop: 12 }}><Button as={Link} to="/">Back home</Button></div>
      </MochiSays>
    </div>
  );
}
