// A JavaScript mirror of the pure rules in contracts/Ratchet.py.  The UI uses it to explain and to
// pre-validate; the contract is always the authority (it re-checks everything on-chain).
export const TIERS = {
  1: { name: 'ORDINARY', short: 'Ordinary', frac: 'strict majority', sym: '> 1/2', color: '#0FB5A6' },
  2: { name: 'QUALIFIED', short: 'Qualified', frac: 'two thirds', sym: '≥ 2/3', color: '#3B3BFF' },
  3: { name: 'ENTRENCHED', short: 'Entrenched', frac: 'four fifths', sym: '≥ 4/5', color: '#7A3CFF' },
  4: { name: 'FOUNDATIONAL', short: 'Foundational', frac: 'unanimity', sym: 'all', color: '#E0245E' },
};

export const LIMITS = {
  MIN_MEMBERS: 3, MAX_MEMBERS: 15, MAX_ARTICLES: 12, MAX_TEXT_BYTES: 500, MAX_NAME_BYTES: 60,
  MIN_MINUTES: 2, MAX_MINUTES: 10080, PAGE: 20,
};

export const KINDS = {
  AMEND: { label: 'Amend', glyph: '✎', floor: 'tier of the edited article (new article: 1)', blurb: 'Adopt, replace or repeal an article of the charter.' },
  GRANT: { label: 'Grant', glyph: '◈', floor: '1 up to 10% of the treasury · 2 up to 50% · 3 above', blurb: 'Pay commons funds to an address.' },
  ADMIT: { label: 'Admit', glyph: '＋', floor: '2', blurb: 'Add a member to the assembly.' },
  EXPEL: { label: 'Expel', glyph: '−', floor: '3', blurb: 'Remove a member (never below 3 members).' },
};

export const STATUS = {
  FILED: { label: 'Filed', tone: 'info', desc: 'Waiting for a member to run the AI classification.' },
  VOTING: { label: 'Voting', tone: 'live', desc: 'Classified. The frozen roster is voting.' },
  CONTESTABLE: { label: 'Contestable', tone: 'warn', desc: 'Vote passed. Open to a one-time challenge before it settles.' },
  ENACTED: { label: 'Enacted', tone: 'ok', desc: 'Passed and applied.' },
  REJECTED: { label: 'Rejected', tone: 'bad', desc: 'The threshold was not met.' },
  LAPSED: { label: 'Lapsed', tone: 'mute', desc: 'Fewer than half the roster voted; the bond went to the treasury.' },
  VOID: { label: 'Void', tone: 'mute', desc: 'Passed, but its effect was no longer applicable.' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'mute', desc: 'Pulled by the proposer before classification.' },
  EXPIRED: { label: 'Expired', tone: 'mute', desc: 'Never classified within the vote window.' },
};
export const FINAL_STATES = ['ENACTED', 'REJECTED', 'LAPSED', 'VOID', 'WITHDRAWN', 'EXPIRED'];

export const validArticleId = (v) => /^[A-Z][A-Z0-9_]{0,11}$/.test(v || '');

/** Smallest number of YES votes for a tier and frozen roster size. */
export function threshold(tier, roster) {
  const n = Number(roster); const t = Number(tier);
  if (t === 1) return Math.floor(n / 2) + 1;
  if (t === 2) return Math.floor((2 * n + 2) / 3);
  if (t === 3) return Math.floor((4 * n + 4) / 5);
  if (t === 4) return n;
  return n;
}

export function deriveTier(floor, touches, tiers) {
  let tier = Number(floor);
  for (const id of Object.keys(touches || {})) if (touches[id] === true) tier = Math.max(tier, Number(tiers[id] ?? 1));
  return tier;
}

export function grantFloor(amount, treasury) {
  const a = BigInt(amount); const t = BigInt(treasury);
  if (a * 10n <= t) return 1;
  if (a * 2n <= t) return 2;
  return 3;
}

/** Mirrors the guard of close_vote(): can anyone close the vote right now? */
export function voteCloseState(m, now) {
  if (!m || m.status !== 'VOTING') return { can: false, why: 'Voting is not open.' };
  const n = m.roster.length; const part = m.yes + m.no;
  const need = threshold(m.tier, n);
  const hopeless = m.yes + (n - part) < need;
  if (part === n) return { can: true, why: 'Everyone has voted.' };
  if (now >= m.vote_deadline) return { can: true, why: 'The deadline has passed.' };
  if (hopeless && part * 2 >= n) return { can: true, why: 'The motion can no longer pass.' };
  return { can: false, why: 'Voting is still open. A passing count never ends it early.' };
}

export const articleTiers = (articles) => Object.fromEntries((articles || []).map((a) => [a.id, Number(a.tier)]));
