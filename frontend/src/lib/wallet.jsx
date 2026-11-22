import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CHAIN } from './config.js';
import { requestAnnouncements, startDiscovery, subscribeProviders } from './eip6963.js';
import { useToast } from './toast.jsx';

const Ctx = createContext(null);
export const useWallet = () => useContext(Ctx);

const KEY = 'ratchet.wallet';        // rdns of the last connected wallet
const OFF = 'ratchet.wallet.off';    // set by an explicit Disconnect so we never silently reconnect
const store = {
  get: (k) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { window.localStorage.setItem(k, v); } catch { /* ignore */ } },
  del: (k) => { try { window.localStorage.removeItem(k); } catch { /* ignore */ } },
};

const hexToInt = (h) => (typeof h === 'string' ? parseInt(h, 16) : Number(h));
const explainError = (e) => {
  if (e?.code === 4001 || /user rejected|denied|rejected/i.test(e?.message || '')) return 'You rejected the request in your wallet.';
  if (e?.code === -32002) return 'A request is already pending in your wallet. Open it to continue.';
  return e?.shortMessage || e?.message || 'The wallet returned an error.';
};

export function WalletProvider({ children }) {
  const toast = useToast();
  const [providers, setProviders] = useState([]);
  const [active, setActive] = useState(null);       // { info, provider }
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | connected
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [balance, setBalance] = useState(null);
  const [switching, setSwitching] = useState(false);
  const detach = useRef(() => {});

  useEffect(() => { startDiscovery(); return subscribeProviders(setProviders); }, []);

  const readBalance = useCallback(async (entry, acc, cid) => {
    if (!entry || !acc || cid !== CHAIN.id) { setBalance(null); return; }
    try { setBalance(BigInt(await entry.provider.request({ method: 'eth_getBalance', params: [acc, 'latest'] }))); } catch { setBalance(null); }
  }, []);

  const attach = useCallback((entry) => {
    const p = entry.provider;
    const onAccounts = (accs) => {
      if (!accs || accs.length === 0) { cleanup(); toast.push({ tone: 'warn', title: 'Wallet disconnected', text: 'The wallet no longer shares an account with this site.' }); return; }
      setAccount(accs[0]);
    };
    const onChain = (cid) => setChainId(hexToInt(cid));
    const onDisc = () => { cleanup(); };
    p.on?.('accountsChanged', onAccounts);
    p.on?.('chainChanged', onChain);
    p.on?.('disconnect', onDisc);
    detach.current = () => {
      p.removeListener?.('accountsChanged', onAccounts);
      p.removeListener?.('chainChanged', onChain);
      p.removeListener?.('disconnect', onDisc);
    };
    // eslint-disable-next-line no-use-before-define
  }, []);

  function cleanup() {
    detach.current(); detach.current = () => {};
    setActive(null); setAccount(null); setChainId(null); setBalance(null); setStatus('disconnected');
  }

  const connect = useCallback(async (uuid) => {
    const entry = providers.find((p) => p.info.uuid === uuid);
    if (!entry) return;
    setStatus('connecting'); setError(null);
    try {
      const accs = await entry.provider.request({ method: 'eth_requestAccounts' });
      if (!accs?.length) throw new Error('No account was shared.');
      const cid = hexToInt(await entry.provider.request({ method: 'eth_chainId' }));
      detach.current();
      attach(entry);
      setActive(entry); setAccount(accs[0]); setChainId(cid); setStatus('connected');
      store.set(KEY, entry.info.rdns); store.del(OFF);
      setModalOpen(false);
      toast.push({ tone: 'ok', title: `Connected to ${entry.info.name}`, text: cid === CHAIN.id ? `On ${CHAIN.short}.` : `The wallet is on chain ${cid}. Switch to ${CHAIN.short} to use the assembly.` });
    } catch (e) {
      setStatus('disconnected'); setError(explainError(e));
      toast.push({ tone: 'bad', title: 'Could not connect', text: explainError(e) });
    }
  }, [providers, attach, toast]);

  const disconnect = useCallback(async () => {
    const entry = active;
    store.set(OFF, '1'); store.del(KEY);
    cleanup();
    // EIP-1193 has no "disconnect"; MetaMask-compatible wallets can revoke the site's permission.
    try { await entry?.provider.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] }); } catch { /* not supported: local disconnect is enough */ }
    toast.push({ tone: 'info', title: 'Disconnected', text: 'This site no longer uses your wallet.' });
  }, [active, toast]);

  const switchNetwork = useCallback(async () => {
    if (!active) return false;
    setSwitching(true);
    const p = active.provider;
    try {
      try {
        await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN.idHex }] });
      } catch (e) {
        if (e?.code === 4902 || e?.data?.originalError?.code === 4902 || /unrecognized|not been added|add .*chain/i.test(e?.message || '')) {
          await p.request({ method: 'wallet_addEthereumChain', params: [{
            chainId: CHAIN.idHex, chainName: CHAIN.name, nativeCurrency: CHAIN.currency,
            rpcUrls: [CHAIN.rpc], blockExplorerUrls: [CHAIN.explorer],
          }] });
        } else throw e;
      }
      const cid = hexToInt(await p.request({ method: 'eth_chainId' }));
      setChainId(cid);
      if (cid === CHAIN.id) toast.push({ tone: 'ok', title: `Switched to ${CHAIN.short}`, text: `Your wallet is now on ${CHAIN.name} (chain ${CHAIN.id}).` });
      return cid === CHAIN.id;
    } catch (e) {
      toast.push({ tone: 'bad', title: 'Network switch failed', text: explainError(e) });
      return false;
    } finally { setSwitching(false); }
  }, [active, toast]);

  // Quiet reconnect (no popup) when this site was connected before and the user did not press Disconnect.
  const tried = useRef(false);
  useEffect(() => {
    if (tried.current || active || providers.length === 0) return;
    const rdns = store.get(KEY);
    if (!rdns || store.get(OFF)) return;
    const entry = providers.find((p) => p.info.rdns === rdns);
    if (!entry) return;
    tried.current = true;
    (async () => {
      try {
        const accs = await entry.provider.request({ method: 'eth_accounts' });
        if (!accs?.length) return;
        const cid = hexToInt(await entry.provider.request({ method: 'eth_chainId' }));
        attach(entry); setActive(entry); setAccount(accs[0]); setChainId(cid); setStatus('connected');
      } catch { /* stay disconnected */ }
    })();
  }, [providers, active, attach]);

  useEffect(() => { readBalance(active, account, chainId); }, [active, account, chainId, readBalance]);

  const value = useMemo(() => ({
    providers, active, account, chainId, status, error, balance, switching,
    connected: status === 'connected' && !!account,
    onStudionet: chainId === CHAIN.id,
    wrongNetwork: status === 'connected' && chainId !== null && chainId !== CHAIN.id,
    connect, disconnect, switchNetwork,
    refreshBalance: () => readBalance(active, account, chainId),
    openModal: () => { requestAnnouncements(); setModalOpen(true); }, closeModal: () => setModalOpen(false), modalOpen,
    provider: active?.provider ?? null,
  }), [providers, active, account, chainId, status, error, balance, switching, connect, disconnect, switchNetwork, readBalance, modalOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
