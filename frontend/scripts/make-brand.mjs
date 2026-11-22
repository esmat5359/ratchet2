// Writes the static brand files (favicon, logo) from the same geometry the app draws.
import fs from 'node:fs';
import { logoSvg } from '../src/lib/gear.js';
fs.mkdirSync('public/brand', { recursive: true });
fs.writeFileSync('public/brand/ratchet-logo.svg', logoSvg({ id: 'a', size: 256 }));
fs.writeFileSync('public/favicon.svg', logoSvg({ id: 'f', size: 64, bg: '#F5F5F5' }));
console.log('brand files written');
