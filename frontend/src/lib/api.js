import { readJson, callRead } from './chain.js';
import { getContract } from './config.js';
import { invalidate, useRead } from './store.js';
import { LIMITS } from './rules.js';

const key = (s) => `${getContract().toLowerCase()}|${s}`;
export const refreshAll = () => invalidate(getContract().toLowerCase());

export const useAssembly = (o = {}) => useRead(key('assembly'), () => readJson('get_assembly'), { ttl: 25000, refresh: 60000, ...o });
export const useCharter = (o = {}) => useRead(key('charter'), () => readJson('get_charter'), { ttl: 40000, refresh: 90000, ...o });
export const useLedger = (o = {}) => useRead(key('ledger'), () => readJson('get_ledger'), { ttl: 30000, ...o });

/** page 0 = the newest LIMITS.PAGE motions.  Rows are returned newest first. */
export function useMotionList(total, page = 0) {
  const n = Number(total ?? 0);
  const upper = n - page * LIMITS.PAGE;
  const offset = Math.max(0, upper - LIMITS.PAGE);
  const limit = Math.min(LIMITS.PAGE, upper - offset);
  return useRead(total === undefined || upper <= 0 ? null : key(`list:${offset}:${limit}`), async () => {
    const r = await readJson('list_motions', [BigInt(offset), BigInt(limit)]);
    return { total: r.total, motions: [...r.motions].reverse() };
  }, { ttl: 20000, refresh: 60000 });
}

export const useMotion = (id, o = {}) => useRead(id ? key(`motion:${id}`) : null, () => readJson('get_motion', [BigInt(id)]), { ttl: 15000, refresh: 30000, ...o });
export const useMyVote = (id, who) => useRead(id && who ? key(`vote:${id}:${who.toLowerCase()}`) : null, () => callRead('get_vote', [BigInt(id), who]), { ttl: 15000 });
export const useClaimable = (who) => useRead(who ? key(`claim:${who.toLowerCase()}`) : null, async () => BigInt(await callRead('get_claimable', [who])), { ttl: 20000 });
export const useStanding = (who) => useRead(who ? key(`standing:${who.toLowerCase()}`) : null, () => readJson('get_standing', [who]), { ttl: 40000 });
