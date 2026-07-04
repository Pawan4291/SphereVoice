```markdown
# SphereVoice

Talk to your Unicity wallet in plain English — SphereVoice parses natural-language commands, executes real transactions on Unicity testnet2, and can autonomously execute scheduled/recurring payments server-side, 24/7, with no human present once funded.

Built for the Unicity Sphere Agents platform: [sphere.unicity.network/agents/custom?url=https://sphere-voice.vercel.app/](https://sphere.unicity.network/agents/custom?url=https://sphere-voice.vercel.app/)

## What it does

- **Chat** — plain English commands ("Send 5 UCT to @alice", "Mint 1000 UCT", "What's my balance?", "Schedule 10 UCT to @bob every 2 minutes for 10 minutes") are parsed by an LLM into structured intents, then executed as real Sphere Connect calls. No mock data — every balance, transfer, and mint is a live testnet2 transaction.
- **Balance** — live asset list via `sphere_getAssets`, with self-mint for test tokens.
- **History** — real transaction history via `sphere_getHistory`.
- **Schedule** — one-time or recurring payments. Funds are deposited upfront into the app's server-side wallet; a cron job checks due schedules every minute and executes real sends autonomously. Pending schedules can be cancelled; cancelled schedules with unused cycles can be refunded back to the funder.
- **Automation Log** — a global, real-time feed of every automated action (scheduled sends, instant sends, mints) across all users, each linked to its transaction on the SMT Explorer.
- **Settings** — connect/disconnect your Sphere wallet, view your nametag and L3 address.

## Architecture

```
Browser (Sphere Connect client)
  → /api/parse        (LLM: English → structured JSON command)
  → sphere.intent()   (send / mint, requires wallet approval)
  → /api/schedule     (Vercel + Upstash Redis: stores schedule records)
  → /api/cron-execute (triggered every minute by an external cron; runs the
                        server-side wallet, checks due schedules, sends real
                        payments, no human present)
  → /api/refund       (refunds unused cycles from a cancelled schedule)
  → /api/activity     (global log of instant sends/mints, shown in Automation Log)
```

## SDK primitives used

- `@unicitylabs/sphere-sdk/connect/browser` — `autoConnect()` for the browser-side Sphere Connect client
- `client.query('sphere_getAssets')`, `client.query('sphere_getHistory')` — reads
- `client.intent('send', ...)`, `client.intent('mint', ...)` — writes requiring wallet approval
- `@unicitylabs/sphere-sdk/impl/nodejs` — `createNodeProviders()` for the server-side automation wallet (used by the cron/refund endpoints)
- `@unicitylabs/sphere-sdk/impl/shared/wallet-api` — `createWalletApiProviders()`
- `Sphere.init()` — server-side wallet initialization with a dedicated mnemonic

## Run instructions (against testnet2)

```bash
npm install
npm run dev
```

Required environment variables (Vercel → Environment Variables):

| Variable | Purpose |
|---|---|
| `VITE_ORACLE_API_KEY` | Sphere oracle/gateway API key (testnet2 requires one) |
| `ASTRID_MNEMONIC` | Mnemonic for the server-side automation wallet |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis for schedule/activity storage |
| `CRON_SECRET` | Bearer token securing `/api/cron-execute` |
| `GROQ_API_KEY` (or your LLM provider key) | Powers `/api/parse` |

An external cron (e.g. cron-job.org) hits `/api/cron-execute` every minute with `Authorization: Bearer <CRON_SECRET>` — Vercel's free-tier native Cron Jobs only run daily, so an external trigger is required for minute-level scheduling.

To self-mint test tokens, use the in-app "Mint" action or the [testnet faucet](https://faucet.unicity.network/faucet/).

## Proof of a real on-chain transaction

Verify any transaction from the app on the SMT Explorer:
`https://unicitynetwork.github.io/smt-explorer/?tx=<TRANSACTION_ID>`

Example: *[paste a real tx ID from your Automation Log or History tab here before submitting]*

## Agentic disclosure

Scheduled/recurring payment execution runs via `/api/cron-execute` with no human present once a schedule is funded — this part is fully autonomous. Chat-triggered sends, mints, and schedule creation are human-initiated. Stated honestly per the submission guidelines: **partial** agentic automation.

## Links

- Sphere SDK: https://github.com/unicity-sphere/sphere-sdk
- SMT Explorer: https://unicitynetwork.github.io/smt-explorer/
- Testnet faucet: https://faucet.unicity.network/faucet/
```
