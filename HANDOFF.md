# Handoff — where to pick up

Written 2026-09-17, end of session. Read `proposal.md` and `README.md` first for the full picture — this is just "what's done, what's not, start here."

## State in one line

Contract compiles and passes 13 simulator tests. Frontend builds and type-checks clean against the real Midnight.js SDK, configured for the **Preview** testnet. **Nothing has been deployed anywhere, and nothing has been run against a real Lace wallet session** — this environment has no browser extension, so that whole path is unverified beyond "it builds."

## Start here, in order

1. **Run the frontend for real, with Lace, against Preview.** This is the single biggest unknown. `cd frontend && npm install && npm run dev`, connect Lace (set to Preview network), try Request Plan. Expect friction — nothing in `lib/duskpay/*` has been exercised against a live wallet, only type-checked. Likely first failures: the `WalletProvider`/`MidnightProvider` adapter in `providers.ts` (the `balanceTx`/`submitTx` string-serialization bridge to Lace's `ConnectedAPI` was written from reading `dapp-connector-api`'s types, not tested against an actual Lace response), or the `CompiledContract` wiring in `contract.ts`.
2. **If you get a deploy to actually go through**, save the contract address (`VITE_CONTRACT_ADDRESS` in `frontend/.env.local`, per `.env.example`) so it's not re-deploying on every fresh environment.
3. **Try `contract/scripts/deploy.ts`** as an alternative to the browser flow. It type-checks but has never been run — needs a funded Preview-testnet seed in `WALLET_SEED`. If `@midnight-ntwrk/wallet`'s `WalletBuilder` output doesn't line up cleanly with what `deployContract` expects, that's the seam to look at (see the script's header comment — it's a separate SDK package generation from `midnight-js-contracts`, same class of version-skew issue documented in README's Troubleshooting).

## Known-unverified areas (type-checked or built successfully, never run)

- Wallet connect → deploy → requestPlan → payInstallment, end to end, in a real browser
- `contract/scripts/deploy.ts`
- Whether Lace's actual `balanceUnsealedTransaction`/`submitTransaction` responses match the shapes `providers.ts` assumes (several `as unknown as` casts there — search for them, they're the exact spots where the type system was overridden by hand and could be wrong)

## If the frontend breaks in a new way

The `vite.config.ts` comments and README's Troubleshooting section document five distinct upstream packaging bugs already found and fixed in the Midnight SDK packages (malformed `exports` fields, hardcoded runtime version pins, WASM bundling gaps, Node-builtin polyfill gaps). If something new breaks, it's very likely another instance of the same pattern — check `git log --oneline` for the commits that fixed the earlier ones, the diagnostic approach (read the actual error, trace it to the specific package/file, verify with `curl`/direct `node_modules` inspection rather than guessing) is repeatable.

## Not started

- Everything under "Mainnet feasibility" in `proposal.md` (real eligibility signal, default handling story, audit)
- Any UI polish beyond the 3 functional screens
- Merchant-side anything (intentionally out of scope per the PRD)
