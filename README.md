# DuskPay

A privacy-preserving Buy Now, Pay Later protocol on Midnight Network. A buyer proves they meet an eligibility threshold with a zero-knowledge proof — only the pass/fail result is ever public, never the value behind it.

## Live

- **App:** https://duskpay.vercel.app/
- **Contract (Midnight Preview testnet):** [`79d672442d9589f1011c4a2f47ec2dd6b21a51ae230b6939737737607c2cb16c`](https://explorer.preview.midnight.network/contracts/79d672442d9589f1011c4a2f47ec2dd6b21a51ae230b6939737737607c2cb16c)

Proving runs on your own machine, so using the hosted app needs the proof server running locally (`docker compose up -d proof-server`) and Lace set to the Preview network.

See [`proposal.md`](./proposal.md) for the product rationale and scope, and [`duskpay-prd.md`](./duskpay-prd.md) for the original requirements doc.

## How it works

1. Buyer connects a Lace wallet and enters a purchase amount, merchant address, installment count, and a private eligibility input.
2. The `checkEligibility` circuit checks that input against a public threshold inside a ZK proof — only the boolean result is disclosed.
3. If eligible, `requestPlan` creates the installment plan on-chain.
4. The buyer calls `payInstallment` manually for each installment; funds go straight to the merchant (no liquidity pool, no automation).
5. `checkStatus` / the ledger's `plans` map track paid-vs-total per plan.

## Project layout

```
contract/       Compact contract source, compiled circuits + ZK keys, Vitest simulator tests
frontend/       Vite + React + TypeScript app (3 screens), wired to the Midnight.js SDK
docker-compose.yml   Local node + indexer + proof-server
indexer-config/      Config override the indexer container needs (see Troubleshooting)
```

## Prerequisites

- Node.js 20+ and npm
- Docker Desktop (or another Docker Engine)
- The [Compact compiler toolchain](https://docs.midnight.network/relnotes/compact) (`compact` CLI) — specifically version **0.31.1**, pinned via `compact update 0.31.1`. This matters: the contract's `pragma language_version 0.23` must match a compiler whose emitted code targets `compact-runtime@0.16.0`, which is what the currently-published `@midnight-ntwrk/midnight-js-contracts` SDK requires. Newer compiler versions (e.g. 0.34.0) emit code that expects a newer runtime the SDK doesn't support yet.
- [Lace wallet](https://www.lace.io/) browser extension, set to the **Preview** network, for actually using the app

## Setup

### 1. Contract

```sh
cd contract
npm install
compact update 0.31.1     # sets the correct compiler as default
npm run build              # compiles src/duskpay.compact -> managed/
npm test                   # runs the 13 Vitest simulator tests
```

### 2. Local Docker environment (optional — only needed for local-chain testing)

The frontend is configured against the public **Preview** testnet by default (see `frontend/src/lib/duskpay/config.ts`), so Docker isn't required to run the app. It's still useful for offline contract testing against a real chain instead of just the simulator.

```sh
docker compose up -d
```

This starts:
- `midnight-node` (0.22.5) — a single-node dev chain, `ws://localhost:9944`
- `indexer` (indexer-standalone 4.2.1) — `http://localhost:8088/api/v4/graphql`
- `proof-server` (8.0.3) — `http://localhost:6300`

Check they're healthy:

```sh
docker compose ps
docker compose logs -f midnight-node   # should show blocks being imported
```

### 3. Frontend

```sh
cd frontend
npm install       # postinstall patches a broken exports field in @midnight-ntwrk/compact-runtime — see Troubleshooting
npm run dev        # http://localhost:5173 (or whatever port Vite picks)
```

To point the frontend at your local Docker chain instead of Preview, set these before `npm run dev`:

```sh
VITE_NODE_URL=ws://localhost:9944 \
VITE_INDEXER_HTTP_URL=http://localhost:8088/api/v4/graphql \
VITE_INDEXER_WS_URL=ws://localhost:8088/api/v4/graphql \
VITE_PROOF_SERVER_URL=http://localhost:6300 \
npm run dev
```

(There's no `VITE_NETWORK_ID` override — `NETWORK_ID` is hardcoded to `'preview'` in `config.ts`. Change it there directly if you need `'undeployed'` for local-chain testing.)

## Usage

1. Open the app, click **Connect Lace** (top right).
2. **Request Plan** (`/`): fill in the merchant's address, total amount, installment count, and your private eligibility input. First submission in a fresh environment deploys the contract (using the threshold field as the constructor argument); afterwards it reuses the address cached in `localStorage`.
3. **My Plans** (`/plans`): see every plan belonging to the connected wallet, with a progress bar and a "Pay next" button.
4. **Plan Detail** (`/plans/:id`): full breakdown of on-chain fields, plus an explicit note on what stayed private.

## Deployment

Nothing is deployed yet — no contract address is recorded anywhere in this repo. Deployment currently happens lazily from the frontend (see step 2 above), or via the CLI script at `contract/scripts/deploy.ts` (see that file for usage). Either way, you'll need a funded signing key for the target network.

## Testing

- Contract: `cd contract && npm test` (Vitest simulator, no network needed)
- Frontend: `cd frontend && npm run build` (type-checks with `tsc -b`, then a full Vite production build)
- CI runs both on every push — see `.github/workflows/`

## Troubleshooting

- **`compact` compiler / language version mismatch errors**: run `compact update 0.31.1` — see Prerequisites above for why the version matters.
- **`npm install` in `frontend/` doesn't seem to fix a "Default condition should be last one" or similar exports error**: the postinstall script (`frontend/scripts/fix-compact-runtime-exports.cjs`) patches this automatically, but it needs to patch **two** separate `node_modules` trees (`frontend/node_modules` and `contract/node_modules`, since the frontend imports the contract's compiled output directly from a sibling directory). Re-run `node scripts/fix-compact-runtime-exports.cjs` from `frontend/` if you've reinstalled either package's dependencies.
- **Indexer container fails with `missing field 'secret'`**: expected — the image's default `config.yaml` doesn't set an API secret. `docker-compose.yml` mounts `indexer-config/config.yaml` over it; don't remove that volume mount.
- **Blank/dark screen with no visible content in the browser**: check the console — this has usually meant a Node-builtin polyfill gap (`process`, `events`) surfacing from the private-state provider's storage backend or a transitive indexer dependency. `vite.config.ts`'s `nodePolyfills()` call and its comments explain the current, working configuration; if you change it, keep `global` disabled specifically (its shim can't resolve from `../contract`'s separate `node_modules`).

## Tech stack

- Contract: [Compact](https://docs.midnight.network/) (Midnight's smart contract language)
- Frontend: Vite, React, TypeScript, Tailwind CSS v4, React Router
- Wallet: Lace, via `@midnight-ntwrk/dapp-connector-api`
- SDK: `@midnight-ntwrk/midnight-js-*` (contracts, providers, network-id)
- Local dev: Docker (node, indexer, proof server), Vitest
