// Records the demo video by driving the real UI in demo mode (simulated assembly + demo wallet).
//   1. npm run build && npx vite preview --port 4173      (the script opens http://localhost:4173/?demo)
//   2. npm i -D puppeteer-core @sparticuz/chromium && node tools/record-demo.mjs
//   3. ffmpeg -f concat -safe 0 -i frames.txt -vf fps=30,format=yuv420p -c:v libx264 -crf 25 -movflags +faststart public/demo/ratchet-demo.mp4
//   4. copy poster.jpg to public/demo/ratchet-demo-poster.jpg and update src/content/video.js from chapters.json
// Note: do not pass GPU/ANGLE flags: software GL makes the screencast crawl.
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const W = 1280, H = 720, URL0 = 'http://localhost:4173/?demo#/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args.filter((a) => !a.includes('gpu') && !a.includes('webgl') && !a.includes('angle')), '--no-sandbox', `--window-size=${W},${H}`], headless: 'shell', defaultViewport: { width: W, height: H } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)));
await page.goto(URL0, { waitUntil: 'networkidle0' });

// ───────── overlay: cursor, captions, title cards
await page.evaluate(() => {
  const st = document.createElement('style');
  st.textContent = `
  #cur{position:fixed;left:640px;top:400px;width:30px;height:30px;z-index:10000;pointer-events:none;transition:left .75s cubic-bezier(.4,0,.2,1),top .75s cubic-bezier(.4,0,.2,1);filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))}
  #cur i{position:absolute;left:-14px;top:-14px;width:30px;height:30px;border-radius:50%;border:3px solid #12D6C8;opacity:0}
  #cur.click i{animation:clk .5s}@keyframes clk{from{opacity:1;transform:scale(.3)}to{opacity:0;transform:scale(1.5)}}
  #cap{position:fixed;left:22px;bottom:22px;max-width:620px;z-index:9998;background:rgba(7,7,20,.88);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:16px;padding:12px 18px;font:600 17px/1.35 Inter Variable,Inter,sans-serif;backdrop-filter:blur(8px);transition:opacity .35s,transform .35s;opacity:0;transform:translateY(10px)}
  #cap.on{opacity:1;transform:none}#cap small{display:block;font:500 12px 'JetBrains Mono',monospace;color:#12D6C8;letter-spacing:.1em;text-transform:uppercase;opacity:1;margin-bottom:3px}
  #card{position:fixed;inset:0;z-index:10001;display:flex;align-items:center;color:#fff;background:#1d2131 center/cover;transition:opacity .7s;font-family:Inter Variable,Inter,sans-serif}
  #card.off{opacity:0;pointer-events:none}
  #card .in{padding:0 80px;max-width:760px;display:flex;flex-direction:column;gap:18px}
  #card h1{font:700 64px/1.02 'Space Grotesk Variable','Space Grotesk',sans-serif;margin:0;letter-spacing:-.03em}
  #card h1 em{font-style:normal;background:linear-gradient(100deg,#6c6bff,#12D6C8 70%);-webkit-background-clip:text;color:transparent}
  #card p{font-size:22px;color:#C7CBE2;margin:0;max-width:34em}#card .row{display:flex;align-items:center;gap:16px}
  #card .row b{font:700 34px 'Space Grotesk Variable','Space Grotesk';letter-spacing:-.02em}
  #card .tag{font:600 14px 'JetBrains Mono',monospace;color:#BFF8F2;letter-spacing:.12em;text-transform:uppercase}`;
  document.head.appendChild(st);
  const cur = document.createElement('div'); cur.id = 'cur';
  cur.innerHTML = '<i></i><svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2l15 9-6.5 1.6L9.6 19z" fill="#fff" stroke="#070707" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(cur);
  const cap = document.createElement('div'); cap.id = 'cap'; document.body.appendChild(cap);
  const card = document.createElement('div'); card.id = 'card'; card.className = 'off'; document.body.appendChild(card);
});
const cap = async (title, text) => { await page.evaluate((t, x) => { const c = document.getElementById('cap'); c.innerHTML = `<small>${t}</small>${x}`; c.classList.add('on'); }, title, text); };
const uncap = () => page.evaluate(() => document.getElementById('cap').classList.remove('on'));
const card = async (html, bg) => { await page.evaluate((h, b) => { const c = document.getElementById('card'); c.style.backgroundImage = `url(${b})`; c.style.backgroundPosition = '100% 50%'; c.innerHTML = h; c.classList.remove('off'); }, html, bg); };
const cardOff = () => page.evaluate(() => document.getElementById('card').classList.add('off'));

const chapters = [];
const t0 = Date.now();
const mark = (title) => { chapters.push({ t: Math.round((Date.now() - t0) / 100) / 10, title }); console.log('chapter', chapters.at(-1)); };

async function box(sel, text) {
  const h = await page.evaluateHandle((s, t) => {
    const all = [...document.querySelectorAll(s)];
    return (t ? all.find((e) => e.textContent.trim().includes(t) && e.offsetParent !== null) : all.find((e) => e.offsetParent !== null)) || null;
  }, sel, text);
  const el = h.asElement(); if (!el) throw new Error(`not found: ${sel} ${text ?? ''}`);
  return el;
}
async function glide(el) {
  await el.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'smooth' })); await sleep(500);
  const b = await el.boundingBox();
  await page.evaluate((x, y) => { const c = document.getElementById('cur'); c.style.left = `${x}px`; c.style.top = `${y}px`; }, b.x + b.width / 2, b.y + b.height / 2);
  await sleep(800);
}
async function click(sel, text) {
  const el = await box(sel, text); await glide(el);
  await page.evaluate(() => { const c = document.getElementById('cur'); c.classList.remove('click'); void c.offsetWidth; c.classList.add('click'); });
  await sleep(120); await el.evaluate((e) => e.click()); await sleep(350);
}
async function type(sel, text, delay = 28) { const el = await box(sel); await glide(el); await el.click(); await el.type(text, { delay }); }
const go = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await sleep(1300); };
async function tx(okText = 'Close') {
  await page.waitForSelector('.tx-result', { timeout: 60000 }); await sleep(2300);
  await click('.modal .btn', okText); await sleep(500);
}
async function actAs(i) { const el = await box('.demo-tools select'); await glide(el); await page.select('.demo-tools select', String(i)); await sleep(900); }

// ───────── recording
const client = await page.createCDPSession();
const frames = [];
client.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => { frames.push({ t: metadata.timestamp, data }); try { await client.send('Page.screencastFrameAck', { sessionId }); } catch { /* ignore */ } });
await client.send('Page.startScreencast', { format: 'jpeg', quality: 84, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
const frameT0 = () => frames[0]?.t;
const startWall = Date.now();

// 0 · title
await card(`<div class="in"><div class="row"><img src="brand/ratchet-logo.svg" width="84" height="84"><b>Ratchet</b></div><div class="tag">Demo · from filing to settlement</div><h1>A constitution that <em>only tightens.</em></h1><p>Tiered articles. AI classification by exact consensus. A challenge game where the bar can only go up. Built on GenLayer.</p></div>`, 'brand/hero-bg.webp');
mark('Meet Ratchet');
await sleep(500);
await page.screenshot({ path: 'poster.jpg', type: 'jpeg', quality: 88 });
await sleep(4200);
await cardOff(); await sleep(900);
await cap('Demo mode', 'Recorded on a simulated assembly with a demo wallet. Nothing here is on-chain.'); await sleep(3600);
await uncap();

// 1 · the idea: scroll the home page
await cap('The idea', 'File, classify, vote, challenge, finalize. A challenge can only raise the tier.');
await page.evaluate(() => window.scrollTo({ top: 760, behavior: 'smooth' })); await sleep(3600);
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(1800);
await uncap();

// 2 · connect (EIP-6963)
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(900);
mark('Connect a wallet (EIP-6963)');
await cap('Connect', 'Wallets announce themselves with EIP-6963. Pick the one you want.');
await click('.topbar .btn', 'Connect wallet'); await sleep(1800);
await click('.wallet-row'); await sleep(2600);

// 3 · wrong network → switch
mark('Switch to Studionet');
await cap('Wrong network', 'The wallet is on chain 1. One click switches it to GenLayer Studionet.'); await sleep(2800);
await click('.net-banner .btn', 'Switch'); await sleep(3000);
await uncap();

// 4 · assembly
await go('#/assembly');
await cap('Assembly', 'Roster, treasury, bond and charter version. You are a member: Ada.'); await sleep(4200);
await go('#/charter'); await cap('Charter', 'Four articles, four tiers. Tier 3 and 4 need 4 of 5 or everyone.'); await sleep(4200);
await uncap();

// 5 · file a motion
mark('File a motion');
await go('#/file');
await cap('File a motion', 'Adopt a new article. The bond is attached exactly and escrowed.');
await sleep(800);
await type('input[placeholder="ARCHIVE"]', 'ADS', 90);
await type('textarea', 'Members may pay for candidate advertising from commons money.', 22);
await sleep(900);
await click('.form .btn', 'File amend motion');
await tx('Open the motion'); await sleep(1500);

// 6 · classify
mark('AI classification by consensus');
await cap('Classify', 'Validators ask an LLM which articles it touches and must answer identically.');
await click('.action .btn', 'Classify'); await sleep(500);
await page.waitForSelector('.tx-live'); await sleep(3800);
await tx('Close'); await sleep(900);
await page.evaluate(() => window.scrollTo({ top: 330, behavior: 'smooth' })); await sleep(1200);
await cap('Strict reading', 'The strict reading touched nothing: tier 1, so 3 of 5 votes are needed.'); await sleep(4200);

// 7 · vote
mark('Vote');
await cap('Vote', 'Each frozen-roster member votes once. Ada, Bo and Cleo vote yes.');
await click('.action .btn', 'Vote yes'); await tx(); await sleep(600);
await actAs(1); await click('.action .btn', 'Vote yes'); await tx(); await sleep(600);
await actAs(2); await click('.action .btn', 'Vote yes'); await tx(); await sleep(800);
await cap('Close the vote', 'A passing count never ends voting early. Fast-forward past the deadline.'); await sleep(3200);
await click('.demo-tools button', '+3 min'); await sleep(1500);
await click('.action .btn', 'Close vote'); await tx(); await sleep(1200);

// 8 · challenge
mark('Challenge: the ratchet turns');
await actAs(3);
await cap('Challenge', 'Dev thinks the first reading was too lenient and challenges with a bond.'); await sleep(3200);
await click('.action .btn', 'Challenge'); await sleep(500);
await page.waitForSelector('.tx-live'); await sleep(3800);
await tx(); await sleep(900);
await page.evaluate(() => window.scrollTo({ top: 330, behavior: 'smooth' })); await sleep(1200);
await cap('The tier ratcheted up', 'The inclusive reading touches A3: tier 1 → 3. Now 4 of 5 are needed.'); await sleep(5200);

// 9 · finalize + withdraw
mark('Finalize and withdraw');
await cap('Finalize', 'Three yes votes are no longer enough. Anyone can settle it.');
await click('.action .btn', 'Finalize'); await tx(); await sleep(700);
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(1200);
await cap('Settled', 'Rejected. The proposer’s bond is refunded; the challenger earns a bounty.'); await sleep(4200);
await go('#/assembly');
await cap('Withdraw', 'Payouts are pull payments. Dev withdraws the bounty.'); await sleep(2600);
await click('.claim .btn', 'Withdraw'); await tx(); await sleep(2000);
await uncap();

// 10 · outro
await card(`<div class="in"><div class="row"><img src="brand/ratchet-logo.svg" width="84" height="84"><b>Ratchet</b></div><h1>Try it on <em>GenLayer Studionet.</em></h1><p>Open source · github.com/reza9133/ratchet<br>Follow the build · x.com/amirhp771</p><div class="row"><img src="brand/genlayer-logo-white.svg" height="34"><span class="tag">Built on GenLayer</span></div></div>`, 'brand/hero-bg.webp');
await sleep(6500);

await client.send('Page.stopScreencast');
await sleep(300);
const total = (Date.now() - startWall) / 1000;
await browser.close();

// ───────── write frames
fs.rmSync('frames', { recursive: true, force: true }); fs.mkdirSync('frames');
let list = '';
for (let i = 0; i < frames.length; i += 1) {
  const f = frames[i];
  fs.writeFileSync(`frames/${String(i).padStart(6, '0')}.jpg`, Buffer.from(f.data, 'base64'));
  const dur = i + 1 < frames.length ? Math.max(0.01, frames[i + 1].t - f.t) : 1.0;
  list += `file 'frames/${String(i).padStart(6, '0')}.jpg'\nduration ${dur.toFixed(4)}\n`;
}
list += `file 'frames/${String(frames.length - 1).padStart(6, '0')}.jpg'\n`;
fs.writeFileSync('frames.txt', list);
fs.writeFileSync('chapters.json', JSON.stringify({ chapters, total, frames: frames.length, span: frames.at(-1).t - frames[0].t }, null, 1));
console.log('frames', frames.length, 'span', (frames.at(-1).t - frames[0].t).toFixed(1), 'wall', total.toFixed(1));
