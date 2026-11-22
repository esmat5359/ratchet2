// EIP-6963 "Multi Injected Provider Discovery": wallets announce themselves with an
// `eip6963:announceProvider` event; a dApp asks for announcements with `eip6963:requestProvider`.
// No global `window.ethereum` is needed (it is only used as a labelled last-resort fallback).
const found = new Map();
const subs = new Set();
let started = false;

function emit() { const list = [...found.values()]; subs.forEach((f) => f(list)); }

function onAnnounce(event) {
  const detail = event?.detail;
  if (!detail?.info?.uuid || !detail?.provider) return;
  found.set(detail.info.uuid, { info: detail.info, provider: detail.provider });
  emit();
}

export function startDiscovery() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('eip6963:announceProvider', onAnnounce);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  // Last resort, only when no wallet announced itself shortly after load.
  setTimeout(() => {
    if (found.size === 0 && window.ethereum) {
      found.set('legacy-injected', {
        info: { uuid: 'legacy-injected', name: window.ethereum.isMetaMask ? 'MetaMask (legacy injection)' : 'Browser wallet (legacy injection)', rdns: 'legacy.injected', icon: '' },
        provider: window.ethereum,
      });
      emit();
    }
  }, 900);
}

export function requestAnnouncements() { window.dispatchEvent(new Event('eip6963:requestProvider')); }

export function subscribeProviders(fn) {
  subs.add(fn); fn([...found.values()]);
  return () => subs.delete(fn);
}
