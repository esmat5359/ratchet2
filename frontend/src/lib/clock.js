// Chain time as the UI sees it.  In demo mode the "Fast-forward" controls add a skew.
let skew = 0;
const subs = new Set();
export const nowSec = () => Math.floor(Date.now() / 1000) + skew;
export const addSkew = (s) => { skew += s; subs.forEach((f) => f()); };
export const resetSkew = () => { skew = 0; subs.forEach((f) => f()); };
export const subscribeClock = (f) => { subs.add(f); return () => subs.delete(f); };
