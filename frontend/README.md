# Ratchet frontend

A multi-page dApp for [Ratchet](../README.md), the self-tightening constitution on GenLayer.
It reads and writes the contract deployed on **GenLayer Studionet** at

```
0xA0a4fB98Da65a8e43B7b8bccb8431FEebEd0AEEe
```

(change it with `VITE_CONTRACT_ADDRESS`, or at run time from **Settings**).

## What is in it

| Page | Route | What it does |
| --- | --- | --- |
| Home | `#/` | Hero, how it works, a 3D ratchet wheel you can tighten (but not loosen), the exact-equality explainer, the **demo video**, latest motions |
| Assembly | `#/assembly` | Roster, treasury, bond, track record, conservation ledger, your standing, donate, **withdraw** |
| Charter | `#/charter` | Articles by tier, votes needed for the current roster, amend / repeal shortcuts |
| Motions | `#/motions` | Every motion, newest first, filters and paging |
| Motion | `#/motions/:id` | Lifecycle, what it touches, vote bar, money, and the actions you can take: **classify, vote, close vote, challenge, finalize, withdraw, expire** |
| File a motion | `#/file` | Forms for amend / grant / admit / expel with the contract's own validation rules |
| Deploy | `#/deploy` | Deploys `contracts/Ratchet.py` with your charter and founders, then points the site at it |
| Docs | `#/docs/...` | Introduction, quickstart, concepts, lifecycle, consensus rule, money, contract API, this frontend, tests, security, FAQ |

## Wallets: EIP-6963, real connect / disconnect, network switch

* **Discovery**: the page listens for `eip6963:announceProvider` and dispatches `eip6963:requestProvider`
  (`src/lib/eip6963.js`). Every announced wallet is listed with its name and icon. `window.ethereum` is used only as a
  labelled last resort when nothing announced itself.
* **Connect**: `eth_requestAccounts` on the wallet you pick. The choice is remembered and restored quietly
  (`eth_accounts`, no popup) on the next visit.
* **Disconnect really disconnects**: listeners are removed, local state is cleared, the wallet is asked to revoke the site's
  permission (`wallet_revokePermissions`, where supported) and a flag prevents silent reconnection.
* **Wrong network**: a banner, a red network pill and a toast tell you the wallet is on another chain. **Switch to Studionet**
  calls `wallet_switchEthereumChain`, falling back to `wallet_addEthereumChain` (chain id 61999, RPC
  `https://studio.genlayer.com/api`, currency GEN). A confirmation toast shows on success.
* **Signing**: `createClient({ chain: studionet, account, provider })` of genlayer-js 1.1.8 signs with the provider you chose.
  The site never asks for a private key.

## Studionet's rate limit

The public RPC allows about 30 requests a minute and sometimes answers with an HTML gateway page. `src/lib/throttle.js`
(ported from `scripts/lib/throttle.mjs`) wraps `fetch` for the RPC origin only: calls are spaced, a refused call is repeated
after a pause, a *read* that hits a gateway error is repeated with a growing pause, and a submission is never repeated.
Pages cache reads and poll slowly; the wallet balance comes from the wallet, not the RPC.

## Run it

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (hash routes + relative assets: any static host works)
```

### Demo mode

Open `/?demo` or use **Settings → Enter demo**. A simulator mirrors the contract's guards and money rules (a keyword
clerk stands in for the LLM) and a **Ratchet Demo Wallet** is announced through EIP-6963. It starts on the wrong network on
purpose, so the switch flow is visible. The top bar lets you act as any founder and fast-forward time. This is also how the
demo video was recorded.

### Host it

* **GitHub Pages**: `.github/workflows/frontend-pages.yml` builds with `VITE_BASE=/<repo>/` and deploys.
* **Vercel / Netlify / any static host**: build command `npm run build`, output `dist`, root `frontend`.

## Brand

* `src/lib/gear.js` is the geometry of the Ratchet mark (a saw-tooth wheel, a pawl and the tier staircase).
  `npm run brand` regenerates `public/favicon.svg` and `public/brand/ratchet-logo.svg` from it.
* `public/brand/` also holds the GenLayer logos (from the GenLayer media kit) and the Mochi mascot cut-out.
* `public/brand/hero-bg*.webp` is the hero background.

## Re-recording the demo video

`tools/record-demo.mjs` drives the real UI in demo mode with headless Chromium, records the screencast and writes frames;
see the comments in the file for the ffmpeg command. It needs `npm i -D puppeteer-core @sparticuz/chromium`.

## Layout

```
src/lib        config, format, rules (mirror of the contract), throttle, store, eip6963, wallet, chain, api, demo
src/components Logo, spinners, wallet UI, transaction modal, 3D wheel, tier staircase, consensus explainer
src/pages      Home, Assembly, Charter, Motions, MotionDetail, FileMotion, Deploy, Docs
src/content    docs.jsx (the documentation), video.js (demo video chapters)
src/contract   Ratchet.py (copy of ../contracts/Ratchet.py, used by the Deploy page)
```

`src/contract/Ratchet.py` must be kept in sync with `contracts/Ratchet.py` (`cp ../contracts/Ratchet.py src/contract/`).
