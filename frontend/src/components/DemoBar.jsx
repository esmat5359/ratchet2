import { useEffect, useState } from 'react';
import { DEMO_ACCOUNTS, demoFastForward, demoSwitchAccount, demoWalletState, resetDemo, subscribeDemo } from '../lib/demo.js';
import { resetSkew } from '../lib/clock.js';
import { setDemo } from '../lib/config.js';
import { invalidate } from '../lib/store.js';
import { useWallet } from '../lib/wallet.jsx';

export default function DemoBar() {
  const w = useWallet();
  const [, tick] = useState(0);
  useEffect(() => subscribeDemo(() => { tick((x) => x + 1); invalidate(''); }), []);
  const st = demoWalletState();
  return (
    <div className="demo-bar">
      <div className="container row between wrap gap-sm">
        <span><b>DEMO MODE</b> · a simulated assembly, nothing is on-chain</span>
        <span className="row gap-sm wrap demo-tools">
          <label>Acting as
            <select value={st.idx} onChange={(e) => demoSwitchAccount(Number(e.target.value))} disabled={!w.connected}>
              {DEMO_ACCOUNTS.map((a, i) => <option key={a.address} value={i}>{a.name}{a.member ? '' : ' (not a member)'}</option>)}
            </select>
          </label>
          <button onClick={() => demoFastForward(60)}>+1 min</button>
          <button onClick={() => demoFastForward(180)}>+3 min</button>
          <button onClick={() => { resetDemo(); resetSkew(); }}>Reset</button>
          <button onClick={() => setDemo(false)}>Exit</button>
        </span>
      </div>
    </div>
  );
}
