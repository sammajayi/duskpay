# DuskPay — Project Proposal

## Summary

DuskPay is a privacy-preserving Buy Now, Pay Later (BNPL) protocol on Midnight Network. A buyer splits a purchase into installments and proves they meet an eligibility threshold using a zero-knowledge proof — the merchant and the chain only ever learn the pass/fail result, never the income, credit signal, or whatever private value was actually checked.

## Problem

Conventional BNPL requires handing financial history to a third party: income, credit data, sometimes identity documents. That data sits in a centralized database, is a breach target, and structurally excludes anyone without a formal credit trail the scorer recognizes. The underlying decision — "does this person qualify?" — doesn't require the raw data to be visible to anyone but the person providing it.

## Approach

Move the eligibility check into a zero-knowledge circuit. The buyer supplies a private numeric input locally; the circuit compares it against a public threshold and produces a boolean. Only that boolean, plus the loan terms (amounts, addresses, payment progress), is written to the public ledger. The raw input never leaves the buyer's device in a form anyone else can read.

This also simplifies the merchant side to almost nothing: a merchant is just a wallet address that receives payments as they're made. No onboarding, no dashboard, no integration work.

## Product and users

Two roles, both intentionally thin:

- **Buyer** — connects a wallet, requests a plan against a merchant they already have an address for, pays installments on their own schedule. Everything they'd normally have to disclose to get approved (income, a credit signal, whatever the eligibility check is actually based on) stays on their device.
- **Merchant** — a wallet address, nothing else. No dashboard, no account, no integration. They receive a direct payment each time the buyer pays an installment, the same as receiving any other on-chain payment.

There's deliberately no third "protocol operator" role collecting fees or holding funds — the contract mediates the eligibility check and tracks state, but every payment flows buyer → merchant directly.

Who this is for: anyone who wants to offer or use installment payments without either side handing sensitive financial data to a party that has to be trusted to store it safely. It's a narrower claim than "DeFi lending" — there's no pooled capital, no interest, no underwriting beyond a single threshold check. It's closer to a privacy-preserving payment-splitting primitive than a lending product, at least at this MVP stage.

## Public vs private data model

This is the actual mechanism the product depends on, so it's worth being precise about what's public and what isn't.

| Data | Visibility | Where |
|---|---|---|
| Raw eligibility input (income, credit signal, whatever number is being checked) | **Private** — never leaves the buyer's device in readable form | Consumed locally as a witness inside the `checkEligibility` circuit |
| Eligibility result (pass/fail) | **Public** | `Plan.eligibilityResult`, written on-chain |
| Eligibility threshold | **Public** | `eligibilityThreshold`, a sealed ledger value set once at contract deploy |
| Borrower address, merchant address | **Public** | `Plan.borrower`, `Plan.merchant` |
| Total amount, installment amount, installment count, paid count | **Public** | `Plan` fields |
| Which wallet is the caller for a given transaction | **Public** (any transaction reveals its sender) | Not something Compact's privacy model hides — DuskPay doesn't attempt shielded/anonymous payments |

The boundary is enforced by the contract, not the frontend: Compact's model makes every witness value private by default, and a circuit has to call `disclose()` explicitly to write something to the public ledger. Concretely, `requestPlan` calls `checkEligibility(privateInput)` internally — the private value crosses into the eligibility comparison, but only the resulting boolean is ever passed to `disclose()`. The frontend's Plan Detail screen mirrors this table directly, so a user can see the same public/private split the contract enforces.

What this model does *not* provide: it doesn't hide loan terms, doesn't hide who's transacting with whom, and doesn't verify that the private input itself is truthful — it proves "the buyer's private number, whatever it is, met the threshold," not "the buyer's private number is accurate." Sourcing a trustworthy signal is the open question noted below.

## Scope (MVP, as built)

**In scope and delivered:**
- A Compact smart contract with 4 circuits: `checkEligibility` (the ZK check), `requestPlan`, `payInstallment`, `checkStatus`
- Direct, incremental merchant payout — each `payInstallment` call forwards funds straight to the merchant, no pooled liquidity
- A 3-screen frontend (request plan / my plans / plan detail) built against the real Midnight.js SDK, with a plan-detail view that explicitly separates public fields from what stayed private
- A local Docker dev environment (node, indexer, proof server) for testing against a real chain without touching a public network
- A Vitest-based contract simulator test suite (13 tests) exercising both the happy paths and the failure modes (ineligible, plan not found, already complete, wrong payer)

**Explicitly out of scope for this MVP** (per the original PRD, unchanged):
- Real credit scoring or external data oracles — the "private input" is self-attested, not sourced from a verified signal
- Interest, late fees, or penalty logic
- A merchant dashboard or any merchant-side integration tooling
- Upfront merchant payout / liquidity pool — deferred, each installment settles individually as paid
- Multi-currency or multi-chain support — single native token, one chain
- Automated default enforcement — nothing chases a buyer who stops paying; the plan just sits partially paid indefinitely

## Architecture

```
contract/     Compact source, compiled circuits + ZK keys, Vitest simulator tests
frontend/     Vite + React + TypeScript app, wired to the Midnight.js SDK and Lace
docker-compose.yml   Local node + indexer + proof-server for dev/testing
```

The frontend talks to the contract through the standard Midnight.js provider stack (`deployContract`/`findDeployedContract`/`callTx`), with a Lace wallet adapter bridging its string-serialized transaction API to the SDK's provider interfaces. See `README.md` for the concrete setup and `frontend/src/lib/duskpay/` for the implementation.

## Current status

- Contract: compiled, tested, not yet deployed anywhere (no address recorded — deployment currently happens lazily from the UI on first use, or via `contract/scripts/deploy.ts`)
- Frontend: builds and type-checks cleanly, configured against Midnight's public **Preview** testnet; not yet exercised end-to-end against a live Lace wallet session
- Docker environment: verified working (node producing blocks, indexer responding, proof server serving ZK params)

## Open questions (deferred past MVP, per the original PRD)

- Where a real eligibility signal comes from beyond a self-attested number — an oracle, an attestation scheme, or some reputation system
- Upfront merchant payout via a liquidity pool (v2)
- Default handling and enforcement, if it's wanted at all given the "no penalties" design goal

## Why Midnight

The entire pitch depends on the eligibility check being provably correct without being visible — that's a zero-knowledge smart contract platform's reason to exist. Compact's `disclose()`-by-default-private model maps directly onto the product requirement: everything is private unless the contract author explicitly marks it public, which makes the privacy boundary a property of the contract itself rather than something the frontend has to enforce by convention. Concretely, that showed up during implementation: the compiler outright rejects a `plans.insert(...)` call that would leak a witness value without an explicit `disclose()` on it (see `duskpay.compact`) — the privacy boundary isn't a code-review convention here, it's a compile error if you get it wrong.

The other reason is more practical: Midnight targets exactly this shape of application — selective disclosure on top of a settlement layer — rather than general-purpose private compute. A generic ZK-rollup or a fully homomorphic scheme could technically do this too, but at far higher engineering cost for no benefit DuskPay actually needs (it never needs to hide *that* a payment happened, only the eligibility input behind it).

## Mainnet feasibility

Nothing about the contract logic is testnet-specific — the same circuits, the same disclosure model, would work unchanged on Mainnet. What actually stands between this MVP and a Mainnet deployment:

- **The eligibility signal itself.** Right now `checkEligibility` trusts whatever number the buyer types in. That's fine for demonstrating the mechanism; it's not a real underwriting product until there's a trustworthy source for that number — an oracle, a signed attestation from an existing credit bureau or income-verification service, or some on-chain reputation system. This is the single biggest gap, and it's explicitly out of scope for the MVP rather than solved.
- **Real funds, real risk surface.** `payInstallment` moves real value with no interest, no late fees, and no default handling by design — reasonable for a demo, but a Mainnet version needs a considered answer to "what happens when a buyer stops paying," even if that answer is "nothing, this is opt-in installment splitting, not credit" made explicit to users rather than left implicit.
- **Contract audit.** The disclosure logic is exactly the kind of code where a subtle mistake (an unintended `disclose()`, or a missing one caught by luck rather than compiler enforcement in a more complex circuit) has real privacy consequences. This hasn't been audited.
- **Operational maturity of the toolchain itself.** Getting this MVP's frontend to build required working around several upstream packaging bugs in currently-published Midnight SDK packages (mismatched `compact-runtime` version pins, a malformed `exports` field, WASM bundling gaps — see `README.md`'s Troubleshooting section and the commit history). None of these are blockers for Mainnet in principle, but they're a sign the SDK ecosystem is still young; a production deployment should budget time for exactly this kind of integration friction.
- **Wallet UX for a non-crypto-native audience.** BNPL's actual target user isn't necessarily someone who already has Lace installed and understands seed phrases. That's a product problem more than a technical one, but it's a real gap between "works on testnet" and "usable by the person a merchant would actually want using it."

None of these are technical blockers to a Mainnet deploy — the contract would compile and run as-is — but they're the difference between "the mechanism works" (what this MVP demonstrates) and "this is a product someone should trust with real money."
