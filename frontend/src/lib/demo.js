// DEMO MODE: an in-memory simulator of contracts/Ratchet.py with the same views, the same guards and the
// same money rules.  The AI clerk is a deterministic keyword clerk (like scripts/sim_bridge.py's SimClerk).
// Nothing here touches a network.  It also announces a "Ratchet Demo Wallet" through EIP-6963 so the whole
// connect / switch-network / sign flow can be tried without a real wallet.
import { addSkew, nowSec } from './clock.js';

export const DEMO_ACCOUNTS = [
  { name: 'Ada', address: '0x7a3c5e91b2d84f60a1c9e3d57b8f2046ac19de35', member: true },
  { name: 'Bo', address: '0x4be2d9f1708c35a6e1b94d27c03fa85d6e12b7c4', member: true },
  { name: 'Cleo', address: '0x91d05c7e3ab84f2d6c1e09b7a5348df2e60c1b9a', member: true },
  { name: 'Dev', address: '0xc08e6b24f9a1d375e2b80c46d91f7a3e5b04d28f', member: true },
  { name: 'Eli', address: '0x2f6a9d03c1e8b57a4d90e6f3b8125c7ad4e91f60', member: true },
  { name: 'Guest', address: '0x5d1b7e9a04c2f863a9e10d4b7c358f26ad91e0b3', member: false },
];
export const demoName = (addr) => DEMO_ACCOUNTS.find((a) => a.address.toLowerCase() === String(addr).toLowerCase())?.name ?? null;

const GEN = 10n ** 18n;
class Revert extends Error {}
const rv = (m) => { throw new Revert(m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lc = (a) => String(a).toLowerCase();
const KIND_FLOOR = { AMEND: 1, GRANT: 1, ADMIT: 2, EXPEL: 3 };
const TIER_NAMES = { 1: 'ORDINARY', 2: 'QUALIFIED', 3: 'ENTRENCHED', 4: 'FOUNDATIONAL' };
const hash32 = (s) => { let h = 0xcbf29ce4; let g = 0x84222325; for (let i = 0; i < s.length; i += 1) { h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; g = Math.imul(g ^ s.charCodeAt(i) + 7, 2246822519) >>> 0; } return (h.toString(16).padStart(8, '0') + g.toString(16).padStart(8, '0')).repeat(4); };
const fakeTx = () => `0x${hash32(String(Math.random()) + Date.now())}`;

const thr = (t, n) => (t === 1 ? Math.floor(n / 2) + 1 : t === 2 ? Math.floor((2 * n + 2) / 3) : t === 3 ? Math.floor((4 * n + 4) / 5) : n);

let S;
const subs = new Set();
const bump = () => subs.forEach((f) => f());
export const subscribeDemo = (f) => { subs.add(f); return () => subs.delete(f); };

function seed() {
  const t = nowSec();
  const members = DEMO_ACCOUNTS.filter((a) => a.member).map((a) => a.address).sort();
  const A = {
    A1: { text: 'Meetings are held on the first Sunday of every month.', tier: 1 },
    A2: { text: 'Membership can only be granted or withdrawn by the assembly itself; no officer may add or remove a member alone.', tier: 4 },
    A3: { text: 'Treasury funds may never be spent on political campaigns.', tier: 3 },
    A4: { text: 'The newsletter is sent by e-mail once a month.', tier: 2 },
  };
  const snap = Object.entries(A).map(([id, a]) => ({ id, text: a.text, tier: a.tier }));
  const m1 = {
    id: 1, kind: 'AMEND', proposer: DEMO_ACCOUNTS[0].address, status: 'ENACTED',
    text: 'The assembly keeps a public archive of its minutes.',
    detail: { article_id: 'ARCHIVE', action: 'ADOPT', new_text: 'The assembly keeps a public archive of its minutes.', new_tier: 1 },
    floor_tier: 1, roster: members, articles: snap, bond: '4000000000000000', bond_left: '0',
    filed_at: t - 5400, stale_at: t - 5280, digest: hash32('motion-1'),
    touches: { A1: false, A2: false, A3: false, A4: false }, tier: 1,
    reason: 'The motion adds a new article about minutes and leaves every existing rule alone.',
    classified_at: t - 5300, vote_deadline: t - 5180, yes: 5, no: 0, closed_at: t - 5250, contest_deadline: t - 5130,
    provisional: 'PASSED', challenge: null, outcome: 'ENACTED', settled_at: t - 5120,
  };
  S = {
    name: 'Willow Street Assembly', bond: 4n * 10n ** 15n, vote_minutes: 2, challenge_minutes: 2, charter_version: 2,
    motion_count: 1, floor: 0, treasury: 3n * 10n ** 16n, escrow: 0n, claimable_total: 0n,
    stats: { filed: 1, enacted: 1, rejected: 0, lapsed: 0, void: 0, raised: 0, upheld: 0 },
    members, articles: { ...A, ARCHIVE: { text: m1.text, tier: 1 } }, motions: { 1: m1 },
    votes: Object.fromEntries(members.map((m) => [`1:${m}`, 1])), claimable: {},
    standing: { [`filed:${DEMO_ACCOUNTS[0].address}`]: 1, [`enacted:${DEMO_ACCOUNTS[0].address}`]: 1 },
    wallets: Object.fromEntries(DEMO_ACCOUNTS.map((a) => [lc(a.address), 1n * GEN])),
  };
}
seed();
export function resetDemo() { seed(); bump(); }

// ----------------------------------------------------------------------- the keyword clerk
const STOP = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'from', 'shall', 'will', 'may', 'are', 'any', 'all', 'not', 'only', 'each', 'every', 'once', 'their', 'its', 'one', 'new', 'has', 'have', 'been', 'such', 'than']);
const stems = (t) => new Set((String(t).toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !STOP.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/, '')));
function clerk(ev, mode) {
  const text = `${ev.motion_text} ${JSON.stringify(ev.motion_detail ?? {})}`;
  const mw = stems(ev.motion_text);
  const touches = {};
  for (const a of ev.articles) {
    const idHit = new RegExp(`\\b${a.id}\\b`, 'i').test(text);
    const aw = stems(a.text);
    let shared = 0; mw.forEach((w) => { if (aw.has(w)) shared += 1; });
    const spend = /spend|spent|fund|pay|grant|campaign|donat/i.test(ev.motion_text) && /treasury|fund/i.test(a.text) && /campaign|elect|political|candidate/i.test(ev.motion_text) && /campaign|political/i.test(a.text);
    touches[a.id] = mode === 'initial' ? idHit || shared >= 3 : idHit || shared >= 2 || spend;
  }
  const hit = Object.keys(touches).filter((k) => touches[k]);
  const reason = hit.length ? `The motion's effect reaches ${hit.join(', ')}.` : 'The motion leaves every other article alone.';
  return { touches, reason };
}

// ----------------------------------------------------------------------- contract logic
const validId = (v) => /^[A-Z][A-Z0-9_]{0,11}$/.test(v || '');
const isMember = (a) => S.members.includes(lc(a));
const utf8 = (s) => new TextEncoder().encode(s).length;
const bounded = (v, limit, label) => { const s = String(v ?? '').trim(); if (!s || utf8(s) > limit) rv(`invalid ${label}: required, at most ${limit} bytes`); return s; };
const addr = (v) => { if (!/^0x[0-9a-fA-F]{40}$/.test(String(v).trim()) || /^0x0{40}$/.test(String(v).trim())) rv('invalid address'); return lc(String(v).trim()); };
const snapshot = () => Object.entries(S.articles).sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, a]) => ({ id, text: a.text, tier: a.tier }));
const credit = (a, amt) => { if (amt <= 0n) return; S.claimable[a] = (S.claimable[a] ?? 0n) + amt; S.claimable_total += amt; };
const bumpStanding = (c, a) => { const k = `${c}:${a}`; S.standing[k] = (S.standing[k] ?? 0) + 1; };
const others = (m) => { const target = m.kind === 'AMEND' ? m.detail.article_id : null; return m.articles.filter((a) => a.id !== target); };
const evidence = (m) => ({ motion_text: m.text, motion_detail: m.detail, articles: others(m).map((a) => ({ id: a.id, text: a.text })) });
const deriveTier = (floor, touches, tiers) => Object.keys(touches).reduce((t, id) => (touches[id] ? Math.max(t, tiers[id]) : t), floor);
const getM = (id) => { const n = Number(id); if (!(n >= 1 && n <= S.motion_count)) rv('motion not found'); return S.motions[n]; };

function release(m) { if (S.floor === m.id) S.floor = 0; }
function refund(m) { const a = BigInt(m.bond_left); if (a > 0n) { credit(m.proposer, a); S.escrow -= a; m.bond_left = '0'; } }
function closeWithoutVote(m, status) { m.status = status; m.outcome = status; m.settled_at = nowSec(); release(m); refund(m); }

function file(sender, kind, detail, text, floor, value) {
  if (!isMember(sender)) rv('members only');
  if (S.floor !== 0) rv('the floor is held by another motion');
  if (value !== S.bond) rv('attach exactly the bond');
  const now = nowSec(); const id = S.motion_count + 1;
  const m = {
    id, kind, proposer: lc(sender), status: 'FILED', text, detail, floor_tier: floor, roster: [...S.members].sort(), articles: snapshot(),
    bond: S.bond.toString(), bond_left: S.bond.toString(), filed_at: now, stale_at: now + S.vote_minutes * 60, digest: '', touches: null, tier: 0,
    reason: '', classified_at: 0, vote_deadline: 0, yes: 0, no: 0, closed_at: 0, contest_deadline: 0, provisional: '', challenge: null, outcome: '', settled_at: 0,
  };
  m.digest = hash32(JSON.stringify(evidence(m)));
  S.motion_count = id; S.floor = id; S.escrow += S.bond; S.stats.filed += 1; bumpStanding('filed', lc(sender));
  S.motions[id] = m;
}

function enact(m) {
  const d = m.detail;
  if (m.kind === 'AMEND') {
    const exists = !!S.articles[d.article_id];
    if (d.action === 'REPEAL') { if (!exists) return 'VOID'; delete S.articles[d.article_id]; } else {
      if (d.action === 'ADOPT' && (exists || Object.keys(S.articles).length >= 12)) return 'VOID';
      if (d.action === 'REPLACE' && !exists) return 'VOID';
      S.articles[d.article_id] = { text: d.new_text, tier: d.new_tier };
    }
    S.charter_version += 1; return 'ENACTED';
  }
  if (m.kind === 'GRANT') { const a = BigInt(d.amount); if (a > S.treasury) return 'VOID'; S.treasury -= a; credit(d.recipient, a); return 'ENACTED'; }
  if (m.kind === 'ADMIT') { if (isMember(d.candidate) || S.members.length >= 15) return 'VOID'; S.members.push(lc(d.candidate)); S.members.sort(); return 'ENACTED'; }
  if (m.kind === 'EXPEL') { if (!isMember(d.member) || S.members.length <= 3) return 'VOID'; S.members = S.members.filter((x) => x !== lc(d.member)); return 'ENACTED'; }
  return 'VOID';
}
function conclude(m) {
  const need = thr(m.tier, m.roster.length);
  const status = m.yes >= need ? enact(m) : 'REJECTED';
  m.status = status; m.outcome = status; m.settled_at = nowSec();
  if (status === 'ENACTED') { S.stats.enacted += 1; bumpStanding('enacted', m.proposer); } else if (status === 'REJECTED') S.stats.rejected += 1; else S.stats.void += 1;
  release(m); refund(m);
}

function exec(sender, fn, a, value) {
  const who = lc(sender ?? '0x');
  switch (fn) {
    case 'file_amendment': {
      const [id, newText0, newTier0] = a; const newTier = Number(newTier0);
      if (!validId(id)) rv('article id must be 1-12 chars of A-Z, 0-9, _ starting with a letter');
      const newText = String(newText0 ?? '').trim();
      if (utf8(newText) > 500) rv('new_text too long or invalid');
      const ex = S.articles[id]; let floor = 1; let action;
      if (ex) {
        floor = Math.max(floor, ex.tier);
        if (newText === '') { if (newTier !== 0) rv('repeal requires new_tier 0'); action = 'REPEAL'; } else {
          if (!(newTier >= 1 && newTier <= 4)) rv('new_tier must be 1-4');
          if (newText === ex.text && newTier === ex.tier) rv('amendment changes nothing');
          action = 'REPLACE';
        }
      } else {
        if (newText === '') rv('cannot repeal an article that does not exist');
        if (!(newTier >= 1 && newTier <= 4)) rv('new_tier must be 1-4');
        if (Object.keys(S.articles).length >= 12) rv('charter is full');
        action = 'ADOPT';
      }
      file(who, 'AMEND', { article_id: id, action, new_text: newText, new_tier: newTier }, newText || `Repeal article ${id}`, floor, value); return;
    }
    case 'file_grant': {
      const rec = addr(a[0]); const amount = BigInt(a[1]); const purpose = bounded(a[2], 500, 'purpose');
      if (amount <= 0n || amount > S.treasury) rv('grant must be positive and within the treasury');
      const floor = amount * 10n <= S.treasury ? 1 : amount * 2n <= S.treasury ? 2 : 3;
      file(who, 'GRANT', { recipient: rec, amount: amount.toString(), treasury_at_filing: S.treasury.toString() }, purpose, floor, value); return;
    }
    case 'file_admission': {
      const c = addr(a[0]); const st = bounded(a[1], 500, 'statement');
      if (isMember(c)) rv('already a member'); if (S.members.length >= 15) rv('roster is full');
      file(who, 'ADMIT', { candidate: c }, st, 2, value); return;
    }
    case 'file_expulsion': {
      const mem = addr(a[0]); const g = bounded(a[1], 500, 'grounds');
      if (!isMember(mem)) rv('not a member'); if (S.members.length <= 3) rv('roster cannot drop below the minimum');
      file(who, 'EXPEL', { member: mem }, g, 3, value); return;
    }
    case 'withdraw_motion': { const m = getM(a[0]); if (m.status !== 'FILED') rv('only an unclassified motion can be withdrawn'); if (who !== m.proposer) rv('only the proposer can withdraw'); closeWithoutVote(m, 'WITHDRAWN'); return; }
    case 'expire_motion': { const m = getM(a[0]); if (m.status !== 'FILED') rv('motion is not waiting for classification'); if (nowSec() < m.stale_at) rv('motion is not stale yet'); closeWithoutVote(m, 'EXPIRED'); return; }
    case 'classify': {
      const m = getM(a[0]); if (!isMember(who)) rv('members only'); if (m.status !== 'FILED') rv('motion is not waiting for classification');
      const o = others(m); const tiers = Object.fromEntries(o.map((x) => [x.id, x.tier]));
      let touches = {}; let reason = 'No other charter article exists; the floor tier applies.';
      if (o.length) { const r = clerk(evidence(m), 'initial'); touches = r.touches; reason = r.reason; }
      const now = nowSec();
      m.touches = touches; m.tier = deriveTier(m.floor_tier, touches, tiers); m.reason = reason;
      m.classified_at = now; m.vote_deadline = now + S.vote_minutes * 60; m.status = 'VOTING'; return;
    }
    case 'vote': {
      const m = getM(a[0]); const support = a[1];
      if (m.status !== 'VOTING') rv('voting is not open'); if (nowSec() >= m.vote_deadline) rv('voting deadline passed');
      if (!m.roster.includes(who)) rv('not on the frozen roster'); if (typeof support !== 'boolean') rv('support must be a boolean');
      const key = `${m.id}:${who}`; if (S.votes[key]) rv('already voted');
      S.votes[key] = support ? 1 : 2; if (support) m.yes += 1; else m.no += 1; return;
    }
    case 'close_vote': {
      const m = getM(a[0]); if (m.status !== 'VOTING') rv('voting is not open');
      const now = nowSec(); const n = m.roster.length; const part = m.yes + m.no; const need = thr(m.tier, n);
      const passed = m.yes >= need; const hopeless = m.yes + (n - part) < need;
      if (!(part === n || now >= m.vote_deadline || (hopeless && part * 2 >= n))) rv('voting is still open');
      m.closed_at = now;
      if (passed) {
        m.provisional = 'PASSED';
        if (others(m).length) { m.status = 'CONTESTABLE'; m.contest_deadline = now + S.challenge_minutes * 60; return; }
        conclude(m); return;
      }
      if (part * 2 < n) {
        m.provisional = 'LAPSED'; m.status = 'LAPSED'; m.outcome = 'LAPSED'; m.settled_at = now; S.stats.lapsed += 1; release(m);
        const left = BigInt(m.bond_left); S.treasury += left; S.escrow -= left; m.bond_left = '0'; return;
      }
      m.provisional = 'REJECTED'; conclude(m); return;
    }
    case 'challenge': {
      const m = getM(a[0]); if (!isMember(who)) rv('members only');
      if (m.status !== 'CONTESTABLE') rv('motion is not contestable'); if (m.challenge) rv('already challenged');
      if (nowSec() > m.contest_deadline) rv('contest window closed'); if (who === m.proposer) rv('proposer cannot challenge own motion');
      if (!m.roster.includes(who)) rv('not on the frozen roster'); if (value !== S.bond) rv('attach exactly the bond');
      const o = others(m); if (!o.length) rv('nothing to contest: no other article exists');
      const tiers = Object.fromEntries(o.map((x) => [x.id, x.tier]));
      const r = clerk(evidence(m), 'challenge');
      const merged = {}; for (const id of Object.keys(r.touches)) merged[id] = !!r.touches[id] || !!m.touches[id];
      const newTier = deriveTier(m.floor_tier, merged, tiers); const oldTier = m.tier; const raised = newTier > oldTier;
      if (raised) {
        const bounty = BigInt(m.bond_left) / 2n; m.bond_left = (BigInt(m.bond_left) - bounty).toString(); S.escrow -= bounty;
        credit(who, S.bond + bounty); S.stats.raised += 1; bumpStanding('raised', who);
      } else {
        const toProp = S.bond / 2n; credit(m.proposer, toProp); S.treasury += S.bond - toProp; S.stats.upheld += 1; bumpStanding('lost', who);
      }
      m.challenge = { by: who, at: nowSec(), touches: r.touches, tier_before: oldTier, tier_after: newTier, raised, reason: r.reason };
      m.touches = merged; m.tier = newTier; return;
    }
    case 'finalize': {
      const m = getM(a[0]); if (m.status !== 'CONTESTABLE') rv('motion is not contestable');
      if (!m.challenge && nowSec() <= m.contest_deadline) rv('contest window still open');
      conclude(m); return;
    }
    case 'donate': { if (value <= 0n) rv('attach a positive amount'); S.treasury += value; return; }
    case 'withdraw': {
      const amt = S.claimable[who] ?? 0n; if (amt <= 0n) rv('nothing to withdraw');
      S.claimable[who] = 0n; S.claimable_total -= amt; S.wallets[who] = (S.wallets[who] ?? 0n) + amt; return;
    }
    default: rv(`unknown method ${fn}`);
  }
}

const AI_FNS = new Set(['classify', 'challenge']);
const STAGES_AI = ['PENDING', 'PROPOSING', 'COMMITTING', 'REVEALING'];

export async function demoWrite({ sender, fn, args, value = 0n, onStage }) {
  onStage?.({ stage: 'wallet' });
  await sleep(700);
  const hash = fakeTx();
  onStage?.({ stage: 'submitted', hash });
  const stages = AI_FNS.has(fn) ? STAGES_AI : ['PENDING', 'PROPOSING'];
  for (const s of stages) { onStage?.({ stage: 'consensus', status: s, hash }); await sleep(AI_FNS.has(fn) ? 1100 : 650); }
  const w = lc(sender);
  const before = S.wallets[w] ?? 0n;
  if (before < value) return { ok: false, kind: 'SUBMIT_ERROR', errorText: 'Insufficient demo funds.', hash };
  const backup = JSON.stringify(S, (k, v) => (typeof v === 'bigint' ? { $big: v.toString() } : v));
  try {
    S.wallets[w] = before - value;
    exec(sender, fn, args, BigInt(value));
    bump();
    return { ok: true, kind: 'OK', status: 'ACCEPTED', hash };
  } catch (e) {
    if (!(e instanceof Revert)) throw e;
    S = JSON.parse(backup, (k, v) => (v && typeof v === 'object' && '$big' in v ? BigInt(v.$big) : v));
    bump();
    return { ok: false, kind: 'EXEC_ERROR', status: 'ACCEPTED', errorText: e.message, hash };
  }
}

export async function demoDeploy({ onStage }) {
  onStage?.({ stage: 'wallet' }); await sleep(600);
  const hash = fakeTx(); onStage?.({ stage: 'submitted', hash }); await sleep(1500);
  return { ok: true, kind: 'OK', status: 'ACCEPTED', hash, address: '0x5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed' };
}

// ----------------------------------------------------------------------- views (same JSON as the contract)
const J = (o) => JSON.stringify(o);
export function demoRead(fn, args = []) {
  switch (fn) {
    case 'get_assembly': return J({
      name: S.name, bond: S.bond.toString(), vote_minutes: S.vote_minutes, challenge_minutes: S.challenge_minutes, charter_version: S.charter_version,
      members: [...S.members].sort(), member_count: S.members.length, article_count: Object.keys(S.articles).length, motion_count: S.motion_count,
      floor_motion: S.floor, treasury: S.treasury.toString(),
      stats: { filed: S.stats.filed, enacted: S.stats.enacted, rejected: S.stats.rejected, lapsed: S.stats.lapsed, void: S.stats.void, challenges_raised: S.stats.raised, challenges_upheld: S.stats.upheld },
    });
    case 'get_charter': return J({ version: S.charter_version, articles: snapshot() });
    case 'get_motion': { const m = structuredClone(getM(args[0])); const tier = m.tier || m.floor_tier; m.votes_needed = thr(tier, m.roster.length); m.effective_tier_name = TIER_NAMES[tier]; return J(m); }
    case 'list_motions': {
      const off = Number(args[0]); const lim = Number(args[1]); const rows = [];
      for (let id = off + 1; id <= Math.min(S.motion_count, off + lim); id += 1) { const m = S.motions[id]; rows.push({ id, kind: m.kind, status: m.status, proposer: m.proposer, tier: m.tier, yes: m.yes, no: m.no }); }
      return J({ total: S.motion_count, motions: rows });
    }
    case 'get_vote': { const m = getM(args[0]); const c = S.votes[`${m.id}:${lc(args[1])}`] ?? 0; return ({ 0: 'NONE', 1: 'YES', 2: 'NO' })[c]; }
    case 'get_claimable': return (S.claimable[lc(args[0])] ?? 0n).toString();
    case 'get_standing': { const a = lc(args[0]); return J(Object.fromEntries(['filed', 'enacted', 'raised', 'lost'].map((c) => [c, S.standing[`${c}:${a}`] ?? 0]))); }
    case 'get_ledger': { const books = S.treasury + S.escrow + S.claimable_total; return J({ balance: books.toString(), treasury: S.treasury.toString(), escrow: S.escrow.toString(), claimable_total: S.claimable_total.toString(), books: books.toString(), solvent: true }); }
    case 'quote_threshold': return thr(Number(args[0]), Number(args[1]));
    default: throw new Error(`unknown view ${fn}`);
  }
}

export const demoFastForward = (sec) => { addSkew(sec); bump(); };

// ----------------------------------------------------------------------- the demo wallet (EIP-6963 + EIP-1193)
const ICON = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#110FFF"/><path d="M32 14l14 8v16l-14 8-14-8V22z" fill="none" stroke="#12D6C8" stroke-width="5" stroke-linejoin="round"/><circle cx="32" cy="30" r="5" fill="#fff"/></svg>')}`;
const wallet = { idx: 0, connected: false, added: false, chain: '0x1', handlers: { accountsChanged: new Set(), chainChanged: new Set(), disconnect: new Set() } };
const emit = (ev, payload) => wallet.handlers[ev]?.forEach((f) => f(payload));
const cur = () => DEMO_ACCOUNTS[wallet.idx].address;

export const demoWalletState = () => ({ idx: wallet.idx, address: cur(), chain: wallet.chain });
export function demoSwitchAccount(i) { wallet.idx = i; if (wallet.connected) emit('accountsChanged', [cur()]); bump(); }

const provider = {
  isDemoWallet: true,
  async request({ method, params = [] }) {
    switch (method) {
      case 'eth_requestAccounts': await sleep(450); wallet.connected = true; return [cur()];
      case 'eth_accounts': return wallet.connected ? [cur()] : [];
      case 'eth_chainId': return wallet.chain;
      case 'wallet_switchEthereumChain': {
        if (params[0]?.chainId === wallet.chain) return null;
        if (!wallet.added) { const e = new Error('Unrecognized chain ID. Try adding the chain using wallet_addEthereumChain first.'); e.code = 4902; throw e; }
        wallet.chain = params[0].chainId; emit('chainChanged', wallet.chain); return null;
      }
      case 'wallet_addEthereumChain': await sleep(500); wallet.added = true; wallet.chain = params[0].chainId; emit('chainChanged', wallet.chain); return null;
      case 'wallet_revokePermissions': wallet.connected = false; return null;
      case 'eth_getBalance': return `0x${(S.wallets[lc(params[0])] ?? 0n).toString(16)}`;
      default: { const e = new Error(`Demo wallet: ${method} is not supported`); e.code = -32601; throw e; }
    }
  },
  on(ev, f) { wallet.handlers[ev]?.add(f); return provider; },
  removeListener(ev, f) { wallet.handlers[ev]?.delete(f); return provider; },
};

export function installDemoWallet() {
  const info = { uuid: 'ratchet-demo-wallet', name: 'Ratchet Demo Wallet', icon: ICON, rdns: 'xyz.ratchet.demo' };
  const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze({ info, provider }) }));
  window.addEventListener('eip6963:requestProvider', announce);
  announce();
}
