import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { isDemo } from './lib/config.js';
import { ToastProvider } from './lib/toast.jsx';
import { WalletProvider } from './lib/wallet.jsx';
import { Footer, SettingsModal, TopBar } from './components/Layout.jsx';
import { NetworkBanner, WalletModal } from './components/Wallet.jsx';
import { TxProvider } from './components/Tx.jsx';
import { PageLoader } from './components/Spinners.jsx';
import Home from './pages/Home.jsx';

const Assembly = lazy(() => import('./pages/Assembly.jsx'));
const Charter = lazy(() => import('./pages/Charter.jsx'));
const Motions = lazy(() => import('./pages/Motions.jsx'));
const MotionDetail = lazy(() => import('./pages/MotionDetail.jsx'));
const FileMotion = lazy(() => import('./pages/FileMotion.jsx'));
const Deploy = lazy(() => import('./pages/Deploy.jsx'));
const Docs = lazy(() => import('./pages/Docs.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const DemoBar = lazy(() => import('./components/DemoBar.jsx'));

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) { const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120); return () => clearTimeout(t); }
    window.scrollTo(0, 0); return undefined;
  }, [pathname, hash]);
  return null;
}

export default function App() {
  const [settings, setSettings] = useState(false);
  return (
    <HashRouter>
      <ToastProvider>
        <WalletProvider>
          <TxProvider>
            <ScrollManager />
            <div className="app">
              <div className="bg-fx" aria-hidden="true"><i /><i /><i /></div>
              <TopBar onSettings={() => setSettings(true)} />
              {isDemo() && <Suspense fallback={null}><DemoBar /></Suspense>}
              <NetworkBanner />
              <main>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/assembly" element={<Assembly />} />
                    <Route path="/charter" element={<Charter />} />
                    <Route path="/motions" element={<Motions />} />
                    <Route path="/motions/:id" element={<MotionDetail />} />
                    <Route path="/file" element={<FileMotion />} />
                    <Route path="/deploy" element={<Deploy />} />
                    <Route path="/docs" element={<Docs />} />
                    <Route path="/docs/:slug" element={<Docs />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
            </div>
            <WalletModal />
            <SettingsModal open={settings} onClose={() => setSettings(false)} />
          </TxProvider>
        </WalletProvider>
      </ToastProvider>
    </HashRouter>
  );
}
