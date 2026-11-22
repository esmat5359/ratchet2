import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './styles/app.css';
import App from './App.jsx';
import { isDemo } from './lib/config.js';

async function boot() {
  if (isDemo()) { const d = await import('./lib/demo.js'); d.installDemoWallet(); }
  createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
}
boot();
