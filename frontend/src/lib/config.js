// Central configuration.  The deployed contract can be overridden at build time
// (VITE_CONTRACT_ADDRESS) or at run time from the Settings dialog (stored in this browser only).
export const DEFAULT_CONTRACT = '0xA0a4fB98Da65a8e43B7b8bccb8431FEebEd0AEEe';
export const DEMO_CONTRACT = '0x5eed5eed5eed5eed5eed5eed5eed5eed5eed5eed';

export const LINKS = {
  github: 'https://github.com/reza9133/ratchet',
  x: 'https://x.com/amirhp771',
  genlayer: 'https://www.genlayer.com',
  studio: 'https://studio.genlayer.com',
  gdocs: 'https://docs.genlayer.com',
};

export const CHAIN = {
  id: 61999,
  idHex: '0xf22f',
  name: 'GenLayer Studio Network',
  short: 'Studionet',
  rpc: import.meta.env.VITE_RPC_URL || 'https://studio.genlayer.com/api',
  explorer: 'https://genlayer-explorer.vercel.app',
  currency: { name: 'GEN Token', symbol: 'GEN', decimals: 18 },
};

export const isDemo = () => {
  try {
    if (new URLSearchParams(window.location.search).has('demo')) return true;
    return window.localStorage.getItem('ratchet.demo') === '1';
  } catch { return false; }
};

export function setDemo(on) {
  try {
    if (on) window.localStorage.setItem('ratchet.demo', '1'); else window.localStorage.removeItem('ratchet.demo');
  } catch { /* storage may be blocked */ }
  const url = new URL(window.location.href);
  url.searchParams.delete('demo');
  window.location.href = url.toString();
  window.location.reload();
}

export function getContract() {
  if (isDemo()) return DEMO_CONTRACT;
  try {
    const saved = window.localStorage.getItem('ratchet.contract');
    if (saved && /^0x[0-9a-fA-F]{40}$/.test(saved)) return saved;
  } catch { /* ignore */ }
  const env = import.meta.env.VITE_CONTRACT_ADDRESS;
  return env && /^0x[0-9a-fA-F]{40}$/.test(env) ? env : DEFAULT_CONTRACT;
}

export function setContract(address) {
  try {
    if (!address || address.toLowerCase() === DEFAULT_CONTRACT.toLowerCase()) window.localStorage.removeItem('ratchet.contract');
    else window.localStorage.setItem('ratchet.contract', address);
  } catch { /* ignore */ }
}

export const explorerAddress = (a) => `${CHAIN.explorer}/address/${a}`;
export const explorerTx = (h) => `${CHAIN.explorer}/tx/${h}`;
