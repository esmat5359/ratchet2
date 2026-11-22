import { Link } from 'react-router-dom';
import { CHAIN, DEFAULT_CONTRACT, LINKS } from '../lib/config.js';
import { KINDS, TIERS, threshold } from '../lib/rules.js';
import { Code } from '../components/ui.jsx';
import { Lifecycle, Tier3D } from '../components/Visuals.jsx';

const Note = ({ tone = 'info', title, children }) => <div className={`callout callout-${tone}`}>{title && <b>{title}</b>}<div>{children}</div></div>;
const Tbl = ({ head, rows, mono }) => (
  <div className="table-wrap"><table className="table small docs-table"><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={mono?.includes(j) ? 'mono' : ''}>{c}</td>)}</tr>)}</tbody></table></div>
);

const ladder = () => (
  <Tbl head={['Tier', 'Name', 'Share', 'Roster of 5', 'Roster of 9']} rows={[1, 2, 3, 4].map((t) => [`${t}`, TIERS[t].name, TIERS[t].frac, `${threshold(t, 5)} / 5`, `${threshold(t, 9)} / 9`])} />
);

export const DOCS = [
  {
    slug: 'introduction', group: 'Start', title: 'Introduction',
    body: () => (
      <>
        <p className="lead">Ratchet is a small assembly that governs itself through a written <b>charter</b> of tiered articles. Every motion (amend the charter, spend treasury funds, admit or expel a member) needs a supermajority that depends on <b>how entrenched the articles it touches are</b>.</p>
        <p>Whether a motion touches an article is a question of <i>meaning</i>, not syntax. GenLayer validators answer it with an LLM, and the answer is binding only if they reproduce it <b>exactly</b>. A member who thinks the first reading was too lenient can <b>challenge</b> it with a bond: the tier can be ratcheted <b>up, never down</b>, and a successful challenger is paid a bounty out of the proposer’s bond.</p>
        <h2>At a glance</h2>
        <ul>
          <li><b>Network</b>: GenLayer Studionet (chain id {CHAIN.id}). Runtime GenVM v0.2.16.</li>
          <li><b>One contract</b>: <code>contracts/Ratchet.py</code>. No owner, no admin, no upgrade path, no oracle.</li>
          <li><b>Deployed at</b>: <code>{DEFAULT_CONTRACT}</code> (change it in Settings).</li>
          <li><b>This site</b>: a multi-page dApp that reads the contract, signs through any EIP-6963 wallet, and ships a demo mode.</li>
        </ul>
        <h2>The idea in one screen</h2>
        <Code lang="text">{`charter           A1 (tier 1)  A2 (tier 4)  A3 (tier 3)  A4 (tier 2)  ...
motion  ---->   "does adopting this motion amend / repeal / override / contradict article X?"
                  (validators must give the SAME true/false for every article)
tier = max(floor tier, tier of every touched article)     <- computed in code, never by the LLM
votes needed = ladder(tier, frozen roster)`}</Code>
        {ladder()}
        <Tier3D tier={4} roster={5} />
        <p>Continue with the <Link to="/docs/quickstart">Quickstart</Link> to use the dApp, or read <Link to="/docs/concepts">Concepts</Link> for the full model.</p>
      </>
    ),
  },
  {
    slug: 'quickstart', group: 'Start', title: 'Quickstart',
    body: () => (
      <>
        <h2>1. Connect a wallet</h2>
        <p>Press <b>Connect wallet</b>. The site discovers wallets with <b>EIP-6963</b>: each installed wallet announces itself and appears in the list with its own name and icon, so you pick the one you want even if several are installed. <b>Disconnect</b> in the wallet menu really disconnects: the site forgets the wallet, stops listening to it, asks it to revoke the permission (where supported) and will not reconnect silently.</p>
        <h2>2. Switch to Studionet</h2>
        <p>If your wallet is on another network, a red banner appears with a <b>Switch to Studionet</b> button. It calls <code>wallet_switchEthereumChain</code> and, if the wallet does not know the network yet, <code>wallet_addEthereumChain</code> with the parameters below. A confirmation toast shows when the switch succeeds.</p>
        <Tbl head={['Field', 'Value']} mono={[1]} rows={[['Network name', CHAIN.name], ['Chain id', `${CHAIN.id} (${CHAIN.idHex})`], ['RPC URL', CHAIN.rpc], ['Currency', 'GEN (18 decimals)'], ['Explorer', CHAIN.explorer]]} />
        <h2>3. Get test GEN</h2>
        <p>Studionet is a test network. Fund your address from the faucet in <a href={LINKS.studio} target="_blank" rel="noreferrer">GenLayer Studio</a>. A motion needs its bond (the demo assembly uses 0.004 GEN) plus a little for fees.</p>
        <h2>4. Are you a member?</h2>
        <p>Only members of the assembly can file, classify, vote and challenge. The <Link to="/assembly">Assembly</Link> page shows your standing. Not a member? You can still read everything, donate and withdraw, or <Link to="/deploy">deploy your own assembly</Link> and become its founder.</p>
        <h2>5. Walk a motion through</h2>
        <ol>
          <li><b>File</b> on <Link to="/file">File a motion</Link>. Your bond is attached exactly.</li>
          <li><b>Classify</b> from the motion page. Validators run the AI reading; this opens the vote.</li>
          <li><b>Vote</b>. Each frozen-roster member votes once. A passing count never ends voting early.</li>
          <li><b>Close the vote</b> when everyone voted, the deadline passed, or it cannot pass any more.</li>
          <li><b>Challenge</b> (optional, one per motion, not by the proposer) to re-read it with the inclusive reading.</li>
          <li><b>Finalize</b> after the challenge window, or right after a challenge. Then <b>Withdraw</b> what you are owed.</li>
        </ol>
        <Note title="Try it without risk">Open <b>Settings → Enter demo</b>. You get a simulated assembly, a demo wallet and time controls. Nothing touches a network.</Note>
      </>
    ),
  },
  {
    slug: 'concepts', group: 'Model', title: 'Concepts',
    body: () => (
      <>
        <h2>Charter and tiers</h2>
        <p>The charter is up to 12 articles <code>{'{id, text, tier}'}</code>. An article id is 1–12 characters of <code>A–Z 0–9 _</code> starting with a letter. Text is at most 500 bytes. The tier says how entrenched the article is.</p>
        {ladder()}
        <h2>Motion kinds and their floor tier</h2>
        <Tbl head={['Kind', 'Effect when enacted', 'Floor tier']} rows={Object.entries(KINDS).map(([k, v]) => [<code key={k}>{k}</code>, v.blurb, v.floor])} />
        <p>The edited article is not sent to the AI as a question (it already counts through the floor); the AI answers for <b>every other</b> article. A grant for a political campaign, for example, climbs to tier 3 because it contradicts an entrenched article, however small it is.</p>
        <h2>The floor lock</h2>
        <p>Only <b>one motion</b> is on the floor at a time. The charter, roster and treasury therefore cannot change between classification and settlement, so the frozen evidence the validators judge is always the evidence the vote and the effect apply to. A member can occupy the floor for at most one vote window without classification (anyone can then <code>expire_motion</code>), or longer by classifying and not voting (the motion lapses and the bond is forfeited).</p>
        <h2>Roster is the sybil boundary</h2>
        <p>Admission needs tier 2, expulsion tier 3 (never below 3 members), and the roster is frozen per motion.</p>
      </>
    ),
  },
  {
    slug: 'lifecycle', group: 'Model', title: 'Motion lifecycle',
    body: () => (
      <>
        <p>Every motion walks the same path. The component below is the same one used on each motion page, with the possible exits listed under each state.</p>
        <div className="card"><Lifecycle status="VOTING" /></div>
        <Tbl head={['State', 'Entered by', 'Leaves by']} rows={[
          ['FILED', 'file_* (exact bond)', 'classify → VOTING · withdraw_motion → WITHDRAWN · expire_motion → EXPIRED'],
          ['VOTING', 'classify (AI, strict reading)', 'close_vote → LAPSED / REJECTED / CONTESTABLE'],
          ['CONTESTABLE', 'close_vote with the threshold met', 'challenge (stays) · finalize → ENACTED / REJECTED / VOID'],
          ['ENACTED', 'finalize, still meets the (possibly higher) threshold', 'final'],
          ['REJECTED', 'close_vote or finalize, threshold missed', 'final'],
          ['LAPSED', 'close_vote, fewer than half the roster voted', 'final, bond forfeited to the treasury'],
          ['VOID', 'finalize, effect no longer applicable', 'final'],
        ]} />
        <Note title="A passing count never ends voting early">Voting closes when everyone has voted, the deadline passed, or the motion is hopeless with at least half the roster voted. This keeps the vote honest: nobody can race to a result.</Note>
      </>
    ),
  },
  {
    slug: 'consensus', group: 'Model', title: 'The consensus rule',
    body: () => (
      <>
        <p className="lead">Every value that is stored, counted or decides the path or payout of a motion must be <b>exactly equal</b> between the leader and each approving validator. No tolerance. Flexible comparison exists only for the free-text <code>reason</code>.</p>
        <Tbl head={['Value', 'Compared how']} rows={[
          ['touches[article] for every article', 'exact: the full boolean map, key for key'],
          ['tier (derived from touches and floor)', 'exact, and recomputed from the booleans so a forged tier cannot ride on correct booleans'],
          ['the set of keys', 'exact: nothing missing, nothing invented, nothing renamed'],
          ['booleans', 'strict: 1, 0, "true", null are rejected, not coerced'],
          ['reason', 'not compared; only made safe (whitespace collapsed, 400 chars)'],
        ]} />
        <h2>How a validator decides</h2>
        <ol>
          <li>Rejects anything that is not a successful leader return.</li>
          <li>Rejects a structurally invalid or internally inconsistent leader result.</li>
          <li>Runs its <b>own independent assessment</b> on the same frozen evidence. It never sees the leader’s answer.</li>
          <li>Approves only if <code>touches</code> and <code>tier</code> are identical.</li>
          <li>Any exception on the validator side is a vote against.</li>
        </ol>
        <p>If validators disagree the transaction ends <b>UNDETERMINED</b> and changes nothing. This site shows exactly that: “No consensus, nothing changed”, with a <b>Try again</b> button.</p>
        <h2>Two readings</h2>
        <Tbl head={['Reading', 'When', 'Rule']} rows={[['STRICT', 'first assessment (classify)', 'true only when the motion’s own words clearly amend, repeal, suspend, override or contradict the article'], ['INCLUSIVE', 'a member’s challenge', 'also true when the literal effect would in practice weaken, bypass or empty the article’s rule']]} />
        <p>A challenge can only <b>add</b> touched articles. The tier ratchets up, never down.</p>
        <h2>Why booleans and a derived level</h2>
        <p>A single question “which tier is this?” invites validators to disagree by one step. Several narrow yes/no questions with a conservative default are far easier to reproduce, and the level is then computed in code.</p>
        <Note tone="ok" title="Liveness trade-off">A borderline motion can fail to reach consensus. That is deliberate: the safe failure mode is “nothing happened, try again”, never “a coin flip moved the money”.</Note>
      </>
    ),
  },
  {
    slug: 'money', group: 'Model', title: 'Money and bonds',
    body: () => (
      <>
        <p>All amounts are wei of the native GEN token. Payouts are <b>pull payments</b> (<code>withdraw</code>), so a failing recipient can never block the assembly.</p>
        <Tbl head={['Event', 'What happens']} rows={[
          ['filing', 'the proposer attaches exactly the bond (held in escrow)'],
          ['ENACTED / REJECTED / VOID / WITHDRAWN / EXPIRED', 'the bond returns to the proposer'],
          ['LAPSED (fewer than half voted)', 'the bond is forfeited to the treasury'],
          ['challenge raises the tier', 'challenger gets their bond back plus half of the proposer’s bond; the other half returns to the proposer'],
          ['challenge fails', 'half the challenger’s bond compensates the proposer, half goes to the treasury'],
          ['donate', 'straight to the treasury'],
          ['GRANT enacted', 'treasury → recipient’s pull balance'],
          ['bounced payout', 'returns to the treasury; nothing is ever lost'],
        ]} />
        <p><code>get_ledger</code> exposes the conservation law, shown live on the <Link to="/assembly">Assembly</Link> page: <code>balance ≥ treasury + escrow + sum(claimable)</code>.</p>
        <Note>Payouts to accounts use an EVM message (<code>_Wallet.emit_transfer</code>). They execute when the withdrawing transaction is <b>finalized</b>, so the balance can arrive a little after you withdraw.</Note>
      </>
    ),
  },
  {
    slug: 'contract-api', group: 'Reference', title: 'Contract API',
    body: () => (
      <>
        <p>Addresses are accepted as <code>0x</code> hex strings and stored lower-case. Integers are passed as <code>BigInt</code> from JavaScript.</p>
        <h2>Writes</h2>
        <Tbl mono={[0]} head={['Method', 'Who', 'Payable', 'Notes']} rows={[
          ['file_amendment(article_id, new_text, new_tier)', 'member', 'bond', 'existing id + empty text + tier 0 = repeal; unknown id = adopt (tier 1–4)'],
          ['file_grant(recipient, amount, purpose)', 'member', 'bond', '0 < amount ≤ treasury'],
          ['file_admission(candidate, statement)', 'member', 'bond', 'candidate must not be a member; roster ≤ 15'],
          ['file_expulsion(member, grounds)', 'member', 'bond', 'roster stays ≥ 3'],
          ['withdraw_motion(motion_id)', 'proposer', 'no', 'only before classification'],
          ['expire_motion(motion_id)', 'anyone', 'no', 'unclassified and older than the vote window'],
          ['classify(motion_id)', 'member', 'no', 'AI consensus, STRICT reading; opens the vote'],
          ['vote(motion_id, support)', 'frozen roster', 'no', 'once; closed at the deadline'],
          ['close_vote(motion_id)', 'anyone', 'no', 'everyone voted, deadline passed, or hopeless'],
          ['challenge(motion_id)', 'roster, not proposer', 'bond', 'AI consensus, INCLUSIVE reading; once per motion'],
          ['finalize(motion_id)', 'anyone', 'no', 'after the challenge window, or right after a challenge'],
          ['donate()', 'anyone', 'value', 'to the treasury'],
          ['withdraw()', 'anyone', 'no', 'pays the caller’s whole pull balance'],
        ]} />
        <h2>Views</h2>
        <p><code>get_assembly</code>, <code>get_charter</code>, <code>get_motion(id)</code>, <code>list_motions(offset, limit)</code> (limit ≤ 20), <code>get_vote(id, voter)</code>, <code>get_claimable(address)</code>, <code>get_standing(address)</code>, <code>get_ledger</code>, <code>quote_threshold(tier, roster_size)</code>. All return JSON strings except <code>get_vote</code>, <code>get_claimable</code> and <code>quote_threshold</code>.</p>
        <h2>Calling it from JavaScript</h2>
        <Code>{`import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const address = '${DEFAULT_CONTRACT}';

// read: no wallet needed
const reader = createClient({ chain: studionet });
const assembly = JSON.parse(await reader.readContract({ address, functionName: 'get_assembly', args: [] }));

// write: sign with the wallet the user picked through EIP-6963
const client = createClient({ chain: studionet, account: userAddress, provider: eip6963Provider });
const hash = await client.writeContract({
  address, functionName: 'file_amendment',
  args: ['ARCHIVE', 'The assembly keeps a public archive of its minutes.', 1n],
  value: BigInt(assembly.bond),
});`}</Code>
      </>
    ),
  },
  {
    slug: 'frontend', group: 'Reference', title: 'This frontend',
    body: () => (
      <>
        <h2>Stack</h2>
        <p>Vite + React 18 + React Router (hash routes, so it runs on any static host, including GitHub Pages), <code>genlayer-js 1.1.8</code>, and <code>three</code> for the 3D wheel. No backend.</p>
        <h2>How it is organised</h2>
        <Tbl mono={[0]} head={['Path', 'What']} rows={[
          ['src/lib/eip6963.js', 'wallet discovery (eip6963:announceProvider / requestProvider)'],
          ['src/lib/wallet.jsx', 'connect, real disconnect, account/chain events, switch network'],
          ['src/lib/chain.js', 'reads and writes through genlayer-js, receipt classification, error messages'],
          ['src/lib/throttle.js', 'RPC rate-limit protection (see below)'],
          ['src/lib/rules.js', 'a JavaScript mirror of the contract’s pure rules, used for previews'],
          ['src/lib/demo.js', 'the demo-mode simulator and the demo wallet'],
          ['src/pages/*', 'Home, Assembly, Charter, Motions, MotionDetail, FileMotion, Deploy, Docs'],
          ['src/contract/Ratchet.py', 'the contract source used by the Deploy page'],
        ]} />
        <h2>Wallets: EIP-6963</h2>
        <p>The page listens for <code>eip6963:announceProvider</code> and then dispatches <code>eip6963:requestProvider</code>. Providers are kept by their uuid. The page never touches <code>window.ethereum</code> except as a labelled last resort when no wallet announced itself. Writes use the chosen provider explicitly: <code>createClient({'{ chain, account, provider }'})</code>.</p>
        <h2>Studionet’s rate limit</h2>
        <p>The public RPC allows about 30 requests a minute and sometimes answers with an HTML gateway page. <code>throttle.js</code> wraps <code>fetch</code> for the RPC origin only: calls are spaced (26 a minute), a refused call is repeated after a pause, and a <i>read</i> that hits a gateway error is repeated with a growing pause. A transaction submission is never repeated after a gateway error. Pages also cache reads and poll slowly, and the wallet’s own balance comes from the wallet, not the RPC.</p>
        <h2>Configuration</h2>
        <Tbl mono={[0]} head={['Variable', 'Meaning']} rows={[['VITE_CONTRACT_ADDRESS', 'deployed Ratchet contract (default: the one in the Introduction)'], ['VITE_RPC_URL', 'override the Studionet RPC'], ['VITE_BASE', 'base path when hosted in a sub-folder (e.g. /ratchet/)']]} />
        <Code lang="bash">{`cd frontend
npm install
npm run dev                          # http://localhost:5173
VITE_CONTRACT_ADDRESS=0x… npm run build   # static site in dist/`}</Code>
        <h2>Demo mode</h2>
        <p>Add <code>?demo</code> to the URL or use Settings. A simulator mirrors the contract’s guards and money rules, a keyword clerk stands in for the LLM, and a <b>Ratchet Demo Wallet</b> is announced through EIP-6963 (it starts on the wrong network on purpose, so you can see the switch flow). The top bar lets you act as any founder and fast-forward time.</p>
        <h2>Deploy your own</h2>
        <p>The <Link to="/deploy">Deploy</Link> page sends <code>contracts/Ratchet.py</code> with your constructor arguments, reads the new address from the receipt, and points the site at it.</p>
      </>
    ),
  },
  {
    slug: 'running', group: 'Reference', title: 'Tests and live runs',
    body: () => (
      <>
        <Code lang="bash">{`bash run.sh            # setup, lint, 190 tests, mutation proof, then a live Studionet run
bash run.sh --fast     # skip the slow mutation suites
bash run.sh --offline  # everything, but the last step runs on the local simulator
bash run.sh --live-only
npm run e2e:sim        # the live script against the local Direct Mode bridge`}</Code>
        <Tbl head={['Suite', 'Count', 'What']} rows={[
          ['tests/direct', '190', 'Direct Mode on the real v0.2.16 SDK: guards, classification, consensus strictness, voting, challenge, settlement, money, randomized walks'],
          ['tests/mutation', '49 mutants', '48 killed, 1 documented equivalent'],
          ['mutation e2e self-check', '10', 'the live script must fail against each broken contract'],
          ['scripts/test', '7', 'receipt classification'],
          ['e2e --sim', '278 checks / 75 txs', 'the whole live scenario on real contract code'],
        ]} />
        <p>The live run uses throw-away keys funded from the Studio faucet. The contract deployed at the default address is the one that run created (<i>Ratchet E2E Assembly</i>), so its founders are those throw-away accounts. Use <Link to="/deploy">Deploy</Link> to get an assembly your own wallet belongs to.</p>
      </>
    ),
  },
  {
    slug: 'security', group: 'Reference', title: 'Security notes',
    body: () => (
      <>
        <Note tone="warn" title="Not audited">Treat Ratchet as a reference implementation.</Note>
        <ul>
          <li><b>The AI is a witness, not an authority.</b> It answers true/false per article against frozen evidence. Levels, thresholds and money are computed by code. Motion text is passed as JSON data and the prompt tells the clerk to treat it as untrusted.</li>
          <li><b>Floor squatting</b> is bounded to one vote window; anyone can expire a stale motion.</li>
          <li><b>Roster = sybil boundary.</b> Admission needs tier 2, expulsion tier 3.</li>
          <li><b>Payouts to contracts</b> are messages; a bounced payout is credited to the treasury.</li>
          <li><b>Time</b> comes from the transaction timestamp; windows are whole minutes (2 to 10080).</li>
          <li><b>No upgrade, no admin.</b> Parameters are fixed at deployment.</li>
          <li><b>This site</b> never asks for a private key. Every write is signed in your wallet. Reads are public.</li>
        </ul>
      </>
    ),
  },
  {
    slug: 'faq', group: 'Reference', title: 'FAQ',
    body: () => (
      <>
        {[
          ['Why can’t I file or vote?', 'Only members of the frozen roster can. Check the Assembly page. You can deploy your own assembly from the Deploy page.'],
          ['Why did classify say “no consensus”?', 'The validators’ AI answers were not exactly identical. By design nothing changed. Send it again.'],
          ['Why is the page slow to load on Studionet?', 'The public RPC is rate limited. Reads are queued and cached; the numbers appear as soon as each answer arrives.'],
          ['I withdrew but my balance did not move.', 'Payouts execute when the withdraw transaction is finalized, not when it is accepted. Wait a little.'],
          ['What does “Wrong network” mean?', 'Your wallet is on another chain. Press Switch to Studionet in the banner.'],
          ['How do I disconnect?', 'Wallet menu → Disconnect. The site forgets the wallet and asks it to revoke access where supported.'],
          ['Where is the demo video?', <>On the <Link to="/#demo">home page</Link>, in the “Demo video” section.</>],
        ].map(([q, a]) => <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>)}
      </>
    ),
  },
];
