// All traffic with the contract goes through this module.
//   reads  : plain JSON-RPC through genlayer-js (no wallet needed), throttled for Studionet's rate limit
//   writes : genlayer-js signing through the EIP-6963 provider the user picked (never window.ethereum)
// In demo mode the same interface is served by an in-memory simulator (lib/demo.js).
import { CHAIN, getContract, isDemo } from './config.js';
import { installThrottle, isTransientError, withTransientRetry } from './throttle.js';

let sdk = null;
async function loadSdk() {
  if (!sdk) {
    const [main, chains, types] = await Promise.all([import('genlayer-js'), import('genlayer-js/chains'), import('genlayer-js/types')]);
    sdk = { createClient: main.createClient, studionet: chains.studionet, TransactionStatus: types.TransactionStatus };
    if (import.meta.env.VITE_RPC_URL) sdk.studionet.rpcUrls.default.http = [import.meta.env.VITE_RPC_URL];
    installThrottle(CHAIN.rpc, 26);
  }
  return sdk;
}

let readClient = null;
async function reader() {
  const { createClient, studionet } = await loadSdk();
  if (!readClient) readClient = createClient({ chain: studionet });
  return readClient;
}

export async function callRead(fn, args = []) {
  if (isDemo()) { const d = await import('./demo.js'); return d.demoRead(fn, args); }
  const client = await reader();
  return withTransientRetry(() => client.readContract({ address: getContract(), functionName: fn, args }), { tries: 3, pause: 4000 });
}
// Money fields are raw integers in the contract's JSON and can exceed 2^53: keep them as exact strings.
export const parseSafe = (text) => JSON.parse(String(text).replace(/"(bond|bond_left|amount|treasury_at_filing)":(\d{10,})/g, '"$1":"$2"'));
export const readJson = async (fn, args = []) => parseSafe(await callRead(fn, args));

// ------------------------------------------------------------------ receipts
const STATUS_BY_NUMBER = { 0: 'UNINITIALIZED', 1: 'PENDING', 2: 'PROPOSING', 3: 'COMMITTING', 4: 'REVEALING', 5: 'ACCEPTED', 6: 'UNDETERMINED', 7: 'FINALIZED', 8: 'CANCELED', 9: 'APPEAL_REVEALING', 10: 'APPEAL_COMMITTING', 11: 'READY_TO_FINALIZE', 12: 'VALIDATORS_TIMEOUT', 13: 'LEADER_TIMEOUT' };
const RESULT_BY_NUMBER = { 0: 'IDLE', 1: 'AGREE', 2: 'DISAGREE', 3: 'TIMEOUT', 4: 'DETERMINISTIC_VIOLATION', 5: 'NO_MAJORITY', 6: 'MAJORITY_AGREE', 7: 'MAJORITY_DISAGREE' };
const EXEC_BY_NUMBER = { 0: 'NOT_VOTED', 1: 'RETURN', 2: 'ERROR' };

function canonical(value, byNumber) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number' || /^\d+$/.test(String(value))) return byNumber[String(value)];
  return String(value).replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toUpperCase();
}
function execName(value) {
  const n = canonical(value, EXEC_BY_NUMBER);
  if (!n) return undefined;
  if (['SUCCESS', 'FINISHED_WITH_RETURN', 'RETURN'].includes(n)) return 'RETURN';
  if (['ERROR', 'FINISHED_WITH_ERROR', 'FAILED', 'FAILURE'].includes(n)) return 'ERROR';
  return n;
}
function strings(v, out = [], depth = 0) {
  if (depth > 6 || v === null || v === undefined) return out;
  if (typeof v === 'string') { out.push(v); return out; }
  if (Array.isArray(v)) { v.forEach((x) => strings(x, out, depth + 1)); return out; }
  if (typeof v === 'object') Object.values(v).forEach((x) => strings(x, out, depth + 1));
  return out;
}
function leaderOf(receipt) {
  const data = receipt?.consensus_data ?? receipt?.consensusData ?? {};
  const raw = data.leader_receipt ?? data.leaderReceipt ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.find((l) => l?.mode === 'leader') ?? list[0] ?? null;
}

export function classifyReceipt(receipt) {
  const status = canonical(receipt?.statusName ?? receipt?.status_name ?? receipt?.status, STATUS_BY_NUMBER);
  const result = canonical(receipt?.resultName ?? receipt?.result_name ?? receipt?.result, RESULT_BY_NUMBER);
  const leader = leaderOf(receipt);
  const exec = execName(receipt?.txExecutionResultName ?? receipt?.tx_execution_result_name ?? receipt?.txExecutionResult
    ?? receipt?.tx_execution_result ?? leader?.execution_result ?? leader?.executionResult);
  const text = strings(leader?.result).join(' ').replace(/\s+/g, ' ').trim().slice(0, 400);
  const decided = status === 'ACCEPTED' || status === 'FINALIZED';
  const agreed = result === undefined || result === 'AGREE' || result === 'MAJORITY_AGREE';
  let kind = 'OK';
  if (!decided) {
    kind = status === 'UNDETERMINED' ? 'UNDETERMINED' : status === 'CANCELED' ? 'CANCELED'
      : ['LEADER_TIMEOUT', 'VALIDATORS_TIMEOUT'].includes(status) ? 'TIMEOUT' : 'PENDING';
  } else if (!agreed) kind = 'UNDETERMINED';
  else if (exec === 'ERROR') kind = 'EXEC_ERROR';
  return { ok: kind === 'OK', kind, status, result, execution: exec, errorText: exec === 'ERROR' ? text : '', finalized: status === 'FINALIZED' };
}

export function deployedAddress(receipt) {
  const c = [receipt?.data?.contract_address, receipt?.data?.contractAddress, receipt?.to_address, receipt?.toAddress, receipt?.recipient];
  return c.find((x) => typeof x === 'string' && /^0x[0-9a-fA-F]{40}$/.test(x) && !/^0x0{40}$/.test(x)) ?? null;
}

const REASONS = [
  [/members only/i, 'Only members of the assembly can do this. Your account is not on the roster.'],
  [/attach exactly the bond/i, 'The bond must be attached exactly. Reload the page and try again.'],
  [/the floor is held by another motion/i, 'Another motion is on the floor. Wait until it settles (or expires).'],
  [/not on the frozen roster/i, 'You were not on the roster when this motion was filed.'],
  [/already voted/i, 'You have already voted on this motion.'],
  [/voting deadline passed/i, 'The voting window has closed.'],
  [/voting is still open/i, 'Voting is still open. A passing count never ends it early.'],
  [/contest window still open/i, 'The challenge window is still open. Finalize after it ends (or right after a challenge).'],
  [/contest window closed/i, 'The challenge window has closed.'],
  [/proposer cannot challenge/i, 'A proposer cannot challenge their own motion.'],
  [/already challenged/i, 'This motion was already challenged (once per motion).'],
  [/nothing to withdraw/i, 'You have nothing to withdraw.'],
  [/motion is not stale yet/i, 'The motion is not stale yet.'],
  [/only the proposer/i, 'Only the proposer can withdraw this motion.'],
  [/amendment changes nothing/i, 'This amendment changes nothing.'],
  [/charter is full/i, 'The charter already holds the maximum of 12 articles.'],
  [/grant must be positive/i, 'The grant must be positive and within the treasury.'],
  [/roster cannot drop below/i, 'The roster cannot drop below 3 members.'],
  [/already a member/i, 'That address is already a member.'],
];
export function humanizeError(text) {
  const t = String(text || '');
  for (const [re, msg] of REASONS) if (re.test(t)) return msg;
  return t ? t.slice(0, 220) : 'The transaction failed.';
}

// ------------------------------------------------------------------ writes
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DONE = ['ACCEPTED', 'FINALIZED', 'UNDETERMINED', 'CANCELED', 'LEADER_TIMEOUT', 'VALIDATORS_TIMEOUT'];

async function watch(client, hash, onStage, { maxMinutes = 25, intervalMs = 7000 } = {}) {
  const until = Date.now() + maxMinutes * 60000;
  let last = '';
  while (Date.now() < until) {
    try {
      const tx = await client.getTransaction({ hash });
      const c = classifyReceipt(tx);
      if (c.status && c.status !== last) { last = c.status; onStage?.({ stage: 'consensus', status: c.status, hash }); }
      if (c.status && DONE.includes(c.status)) return { ...c, hash, receipt: tx };
    } catch (e) { if (!isTransientError(e)) { /* a not-yet-indexed hash looks like an error: keep waiting */ } }
    await sleep(intervalMs);
  }
  return { ok: false, kind: 'TIMEOUT', status: 'PENDING', errorText: 'No final answer yet. Check the explorer for this transaction.', hash };
}

/** Sends one contract call from the connected wallet and follows it until consensus answers. */
export async function sendTx({ account, provider, fn, args = [], value = 0n, onStage }) {
  if (isDemo()) { const d = await import('./demo.js'); return d.demoWrite({ sender: account, fn, args, value, onStage }); }
  const { createClient, studionet } = await loadSdk();
  const client = createClient({ chain: studionet, account, provider });
  onStage?.({ stage: 'wallet' });
  let hash;
  try {
    hash = await client.writeContract({ address: getContract(), functionName: fn, args, value, leaderOnly: false });
  } catch (e) {
    const rejected = e?.code === 4001 || /user rejected|denied/i.test(String(e?.message));
    return { ok: false, kind: rejected ? 'REJECTED' : 'SUBMIT_ERROR', errorText: rejected ? 'You rejected the request in your wallet.' : String(e?.shortMessage ?? e?.message ?? e).slice(0, 300), hash: null };
  }
  onStage?.({ stage: 'submitted', hash });
  return watch(client, hash, onStage);
}

/** Deploys a new Ratchet assembly from the connected wallet. */
export async function deployAssembly({ account, provider, code, args, onStage }) {
  if (isDemo()) { const d = await import('./demo.js'); return d.demoDeploy({ onStage }); }
  const { createClient, studionet } = await loadSdk();
  const client = createClient({ chain: studionet, account, provider });
  onStage?.({ stage: 'wallet' });
  let hash;
  try { hash = await client.deployContract({ code, args, leaderOnly: false }); } catch (e) {
    const rejected = e?.code === 4001 || /user rejected|denied/i.test(String(e?.message));
    return { ok: false, kind: rejected ? 'REJECTED' : 'SUBMIT_ERROR', errorText: rejected ? 'You rejected the request in your wallet.' : String(e?.shortMessage ?? e?.message ?? e).slice(0, 300), hash: null };
  }
  onStage?.({ stage: 'submitted', hash });
  const out = await watch(client, hash, onStage);
  out.address = deployedAddress(out.receipt);
  return out;
}
