# DuskPay — Project Proposal

## Summary

DuskPay is a privacy-preserving Buy Now, Pay Later (BNPL) protocol on Midnight Network. A buyer splits a purchase into installments and proves they meet an eligibility threshold using a zero-knowledge proof — the merchant and the chain only ever learn the pass/fail result, never the income, credit signal, or whatever private value was actually checked.

## Problem

Conventional BNPL requires handing financial history to a third party: income, credit data, sometimes identity documents. That data sits in a centralized database, is a breach target, and structurally excludes anyone without a formal credit trail the scorer recognizes. The underlying decision — "does this person qualify?" — doesn't require the raw data to be visible to anyone but the person providing it.

## Approach

Move the eligibility check into a zero-knowledge circuit. The buyer supplies a private numeric input locally; the circuit compares it against a public threshold and produces a boolean. Only that boolean, plus the loan terms (amounts, addresses, payment progress), is written to the public ledger. The raw input never leaves the buyer's device in a form anyone else can read.

This also simplifies the merchant side to almost nothing: a merchant is just a wallet address that receives payments as they're made. No onboarding, no dashboard, no integration work.

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

The entire pitch depends on the eligibility check being provably correct without being visible — that's a zero-knowledge smart contract platform's reason to exist. Compact's `disclose()`-by-default-private model maps directly onto the product requirement: everything is private unless the contract author explicitly marks it public, which makes the privacy boundary a property of the contract itself rather than something the frontend has to enforce by convention.
