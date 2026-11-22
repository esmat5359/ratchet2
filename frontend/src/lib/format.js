export const ZERO = '0x0000000000000000000000000000000000000000';
export const isAddress = (v) => typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v.trim()) && !/^0x0{40}$/i.test(v.trim());
export const sameAddr = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
export const shortAddr = (a, l = 6, r = 4) => (a && a.length > l + r + 2 ? `${a.slice(0, l + 2)}…${a.slice(-r)}` : a || '');

/** wei (bigint | string | number) -> "0.004" (trimmed), never uses floating point. */
export function fmtGen(wei, maxDp = 6) {
  let v;
  try { v = BigInt(wei ?? 0); } catch { return '0'; }
  const neg = v < 0n; if (neg) v = -v;
  const base = 10n ** 18n;
  const whole = v / base;
  let frac = (v % base).toString().padStart(18, '0').slice(0, maxDp).replace(/0+$/, '');
  if (!frac && v % base !== 0n) frac = '0'.repeat(Math.max(0, maxDp - 1)) + '1';
  return `${neg ? '-' : ''}${whole.toString()}${frac ? `.${frac}` : ''}`;
}

/** "0.004" -> wei bigint, or null when the text is not a valid amount. */
export function parseGen(text) {
  const t = String(text ?? '').trim();
  if (!/^\d+(\.\d{1,18})?$/.test(t)) return null;
  const [w, f = ''] = t.split('.');
  return BigInt(w) * 10n ** 18n + BigInt(f.padEnd(18, '0'));
}

export const fmtDate = (ts) => (ts ? new Date(ts * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export function fmtDuration(sec) {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400); const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const utf8Len = (s) => new TextEncoder().encode(s ?? '').length;
export const cx = (...a) => a.filter(Boolean).join(' ');
