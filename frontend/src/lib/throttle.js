// Studionet's RPC allows about 30 requests a minute and now and then answers with an HTML gateway page or
// "Internal error".  This wraps window.fetch for requests to the RPC origin only (so the genlayer-js SDK's own
// calls are covered too): calls are spaced evenly, a refused call is repeated after a pause, and a READ that
// hits a gateway error is repeated with a growing pause.  A submission is never repeated after a gateway
// error (the network may already have accepted it).  Ported from scripts/lib/throttle.mjs of the repo.
const RATE_LIMITED = /rate limit|too many requests/i;
const TRANSIENT_TEXT = /internal error|temporar|try again|bad gateway|service unavailable|gateway time-?out/i;
const IDEMPOTENT = /^(eth_(get|call|estimate|chainId|blockNumber|gasPrice|feeHistory|maxPriority)|net_|web3_|gen_(call|get|estimate)|sim_get)/i;

function methodsOf(init) {
  try {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    if (!body) return [];
    return (Array.isArray(body) ? body : [body]).map((x) => String(x?.method ?? ''));
  } catch { return []; }
}
const isIdempotent = (methods) => methods.length > 0 && methods.every((m) => IDEMPOTENT.test(m));

function classifyResponse(status, text) {
  const head = String(text ?? '').trimStart();
  if (status === 429) return 'rate';
  if (head.length < 2000 && RATE_LIMITED.test(head)) return 'rate';
  if (status >= 500 && status < 600) return 'transient';
  if (head.startsWith('<')) return 'transient';
  if (head.startsWith('{') && head.includes('"error"')) {
    try {
      const err = JSON.parse(head)?.error;
      if (err) {
        const msg = `${err.message ?? ''} ${typeof err.data === 'string' ? err.data : ''}`;
        if (RATE_LIMITED.test(msg)) return 'rate';
        if (err.code === -32603 || TRANSIENT_TEXT.test(msg)) return 'transient';
      }
    } catch { /* leave it to the caller */ }
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const throttleStats = { sent: 0, rateRefused: 0, transient: 0, waiting: 0 };
let installed = false;

export function installThrottle(rpcUrl, perMinute = 26) {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const original = window.fetch.bind(window);
  const spacing = Math.ceil(60000 / perMinute);
  const origin = new URL(rpcUrl).origin;
  let next = 0;

  async function slot() {
    const at = Math.max(Date.now(), next);
    next = at + spacing;
    const wait = at - Date.now();
    if (wait > 0) { throttleStats.waiting += 1; try { await sleep(wait); } finally { throttleStats.waiting -= 1; } }
  }

  window.fetch = async function throttled(input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url ?? '';
    if (!url.startsWith(origin)) return original(input, init);
    const safe = isIdempotent(methodsOf(init));
    let rate = 0; let transient = 0;
    for (;;) {
      await slot();
      throttleStats.sent += 1;
      let res;
      try { res = await original(input, init); } catch (error) {
        if (!safe || transient >= 5) throw error;
        transient += 1; throttleStats.transient += 1;
        const pause = Math.min(20000, 2500 * 2 ** (transient - 1));
        next = Math.max(next, Date.now() + pause); await sleep(pause); continue;
      }
      const text = await res.clone().text().catch(() => '');
      const kind = classifyResponse(res.status, text);
      if (!kind) return res;
      if (kind === 'rate') {
        throttleStats.rateRefused += 1;
        if (rate >= 6) return res;
        rate += 1; const pause = Math.min(45000, 6000 * rate);
        next = Math.max(next, Date.now() + pause); await sleep(pause); continue;
      }
      throttleStats.transient += 1;
      if (!safe || transient >= 5) return res;
      transient += 1; const pause = Math.min(20000, 2500 * 2 ** (transient - 1));
      next = Math.max(next, Date.now() + pause); await sleep(pause);
    }
  };
}

export const TRANSIENT_ERROR = /Unexpected token '<'|<!DOCTYPE|is not valid JSON|Internal error|HTTP request failed|Failed to fetch|NetworkError|Load failed|Bad Gateway|Service Unavailable|Gateway Time-?out|Rate limit/i;
export const isTransientError = (e) => TRANSIENT_ERROR.test(String(e?.message ?? e));

export async function withTransientRetry(fn, { tries = 4, pause = 4000 } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try { return await fn(); } catch (error) {
      if (attempt >= tries || !isTransientError(error)) throw error;
      await sleep(Math.min(30000, pause * attempt));
    }
  }
}
