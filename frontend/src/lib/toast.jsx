import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastCtx = createContext({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const id = useRef(0);
  const dismiss = useCallback((i) => setItems((l) => l.filter((t) => t.id !== i)), []);
  const push = useCallback((t) => {
    const n = ++id.current;
    const item = typeof t === 'string' ? { text: t } : t;
    setItems((l) => [...l.slice(-3), { id: n, tone: 'info', ttl: 4800, ...item }]);
    if (item.ttl !== 0) setTimeout(() => dismiss(n), item.ttl ?? 4800);
    return n;
  }, [dismiss]);
  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`} onClick={() => dismiss(t.id)}>
            <span className="toast-dot" />
            <div>{t.title && <b>{t.title}</b>}<span>{t.text}</span></div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
