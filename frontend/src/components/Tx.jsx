import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { deployAssembly, humanizeError, sendTx } from '../lib/chain.js';
import { explorerTx, getContract } from '../lib/config.js';
import { invalidate } from '../lib/store.js';
import { useToast } from '../lib/toast.jsx';
import { useWallet } from '../lib/wallet.jsx';
import { Modal } from './Wallet.jsx';
import { ConsensusLoader, RatchetSpinner } from './Spinners.jsx';
import { Button } from './ui.jsx';
import { shortAddr } from '../lib/format.js';

const Ctx = createContext(null);
export const useTx = () => useContext(Ctx);

const STATUS_TEXT = {
  PENDING: 'Waiting in the validators’ queue…',
  ACTIVATED: 'Activated: validators are picking it up…',
  PROPOSING: 'The leader validator is running the transaction and proposing a result.',
  COMMITTING: 'Validators run it independently and commit their own answers.',
  REVEALING: 'Validators reveal their answers. For AI calls they must be exactly identical.',
  ACCEPTED: 'Consensus reached.',
  READY_TO_FINALIZE: 'Accepted. Waiting for finalization.',
  UNDETERMINED: 'The validators did not agree.',
};

export function TxProvider({ children }) {
  const w = useWallet(); const toast = useToast();
  const [tx, setTx] = useState(null);
  const specRef = useRef(null);

  const run = useCallback(async (spec) => {
    specRef.current = spec;
    if (!w.connected) { w.openModal(); toast.push({ tone: 'warn', text: 'Connect a wallet first.' }); return null; }
    if (!w.onStudionet) { const ok = await w.switchNetwork(); if (!ok) return null; }
    setTx({ title: spec.title, ai: !!spec.ai, stage: 'wallet', summary: spec.summary, value: spec.value });
    const onStage = (s) => setTx((t) => (t ? { ...t, ...s } : t));
    const result = spec.deploy
      ? await deployAssembly({ account: w.account, provider: w.provider, code: spec.deploy.code, args: spec.deploy.args, onStage })
      : await sendTx({ account: w.account, provider: w.provider, fn: spec.fn, args: spec.args ?? [], value: spec.value ?? 0n, onStage });
    setTx((t) => (t ? { ...t, stage: 'done', result } : t));
    invalidate(getContract().toLowerCase());
    w.refreshBalance();
    if (result.ok) spec.onDone?.(result);
    return result;
  }, [w, toast]);

  const close = () => setTx(null);
  const retry = () => { const s = specRef.current; setTx(null); if (s) run(s); };
  const value = useMemo(() => ({ run, busy: !!tx && tx.stage !== 'done' }), [run, tx]);
  const r = tx?.result;
  const finished = tx?.stage === 'done';
  const steps = ['Confirm in your wallet', 'Sent to GenLayer', tx?.ai ? 'Validators reach consensus on the AI answer' : 'Validators process it', 'Accepted'];
  const idx = !tx ? 0 : tx.stage === 'wallet' ? 0 : tx.stage === 'submitted' ? 1 : tx.stage === 'consensus' ? 2 : 3;
  const spec = specRef.current;

  return (
    <Ctx.Provider value={value}>
      {children}
      <Modal open={!!tx} title={tx?.title} locked={!finished} onClose={close}>
        {tx && !finished && (
          <div className="tx-live">
            {tx.stage === 'consensus' && tx.ai ? <ConsensusLoader size={170} /> : <RatchetSpinner size={110} />}
            <ol className="tx-steps">
              {steps.map((s, i) => <li key={s} className={i < idx ? 'done' : i === idx ? 'now' : ''}><span>{i < idx ? '✓' : i + 1}</span>{s}</li>)}
            </ol>
            <p className="tx-note">
              {tx.stage === 'wallet' && 'Check your wallet and confirm the transaction.'}
              {tx.stage === 'submitted' && 'Waiting for the network to pick it up…'}
              {tx.stage === 'consensus' && (STATUS_TEXT[tx.status] ?? `Status: ${tx.status}`)}
            </p>
            {tx.hash && <a className="mono tx-hash" href={explorerTx(tx.hash)} target="_blank" rel="noreferrer">{shortAddr(tx.hash, 10, 8)} ↗</a>}
            {tx.ai && tx.stage === 'consensus' && <p className="hint">Every validator reads the frozen evidence on its own. The result is accepted only if their per-article answers match <b>exactly</b>.</p>}
          </div>
        )}
        {tx && finished && r?.ok && (
          <div className="tx-result ok">
            <div className="tick"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg></div>
            <h3>{spec?.successTitle ?? 'Done'}</h3>
            <p className="muted">{spec?.successText ?? 'The transaction was accepted by consensus.'}</p>
            {r.hash && <a className="mono tx-hash" href={explorerTx(r.hash)} target="_blank" rel="noreferrer">{shortAddr(r.hash, 10, 8)} ↗</a>}
            <div className="row gap-sm center wrap" style={{ marginTop: 16 }}>
              {spec?.nextTo && <Button as={Link} to={spec.nextTo} onClick={close}>{spec.nextLabel ?? 'Continue'}</Button>}
              <Button variant="ghost" onClick={close}>Close</Button>
            </div>
          </div>
        )}
        {tx && finished && r && !r.ok && (
          <div className={`tx-result ${r.kind === 'UNDETERMINED' ? 'warn' : 'bad'}`}>
            <div className="tick"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d={r.kind === 'UNDETERMINED' ? 'M18 26h16' : 'M18 18l16 16M34 18L18 34'} /></svg></div>
            <h3>{r.kind === 'UNDETERMINED' ? 'No consensus, nothing changed' : r.kind === 'REJECTED' ? 'Request rejected' : 'Transaction failed'}</h3>
            <p className="muted">
              {r.kind === 'UNDETERMINED'
                ? 'The validators’ AI answers were not exactly identical, so by design the contract did not change at all. You can simply send it again.'
                : humanizeError(r.errorText)}
            </p>
            {r.kind === 'EXEC_ERROR' && <p className="hint">The contract reverted this call, so no value was kept by it.</p>}
            <div className="row gap-sm center wrap" style={{ marginTop: 16 }}>
              {(r.kind === 'UNDETERMINED' || r.kind === 'TIMEOUT' || r.kind === 'REJECTED') && <Button onClick={retry}>Try again</Button>}
              <Button variant="ghost" onClick={close}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </Ctx.Provider>
  );
}
