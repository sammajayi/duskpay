# DuskPay — Product Requirements Document (MVP)

## 1. Overview

DuskPay is a privacy-preserving Buy Now, Pay Later (BNPL) protocol built on Midnight Network. Users split purchases into installments and get approved using zero-knowledge proofs of credit eligibility, without exposing their income, financial history, or identity to the merchant or the protocol itself. Only a single eligible/not-eligible signal is ever disclosed on-chain.

## 2. Problem

Traditional BNPL requires users to hand over financial history, identity documents, or credit data to a third party. That data sits in centralized databases, is a breach target, and often excludes users without a formal credit history. DuskPay proves eligibility without revealing the underlying data.

## 3. Goals (MVP)

- Prove the core mechanism works: private input in, public boolean out, installment plan created on-chain
- Ship a minimal, functional three-party flow: user, merchant, protocol
- Keep scope small enough to build, test, and demo within a hackathon timeline

## 4. Non-goals (MVP)

- Real credit scoring or external data oracles
- Interest, late fees, or penalty logic
- Merchant dashboard, onboarding, or integration tooling
- Upfront merchant payout / liquidity pool (deferred to v2)
- Multi-currency or multi-chain support
- Automated default enforcement (relayer/keeper)

## 5. User roles

| Role | Description | On-chain footprint |
|---|---|---|
| Buyer | Initiates a purchase, submits private eligibility input, pays installments | Wallet address, plan ID, payment status |
| Merchant | Receives incremental payments as installments are paid | Wallet address only |
| Protocol | Verifies the eligibility proof, tracks plan state | Contract logic |

Merchant has zero setup beyond providing a wallet address. No merchant-side integration is required for v1.

## 6. Core user flow

1. Buyer connects wallet (Lace)
2. Buyer enters purchase amount, merchant address, and a private eligibility input (e.g. income/debt ratio)
3. Client generates a ZK proof of eligibility against a threshold
4. Contract verifies the proof; if eligible, creates an installment plan
5. Contract discloses only the eligible/not-eligible result, never the underlying input
6. Buyer pays installments over time; each payment forwards to the merchant
7. Contract tracks paid count vs total; plan is marked complete when fully paid

## 7. Functional requirements

### 7.1 Eligibility circuit
- Takes a private numeric input (witness) and a threshold
- Outputs a single boolean, disclosed on-chain
- No other private data is ever disclosed

### 7.2 Installment contract
- Ledger state (flat maps keyed by plan ID): borrower, merchant, total amount, installment amount, installment count, paid count, eligibility result
- `requestPlan`: verifies eligibility, creates plan
- `payInstallment`: advances paid count, authorizes forwarding of funds to merchant
- `checkStatus`: read-only, returns paid/total

### 7.3 Frontend
- Screen 1 — Request plan: amount, merchant address, private input field, submit with proof-generation loading state
- Screen 2 — My plans: list of active plans with progress indicator, pay button
- Screen 3 — Plan detail: on-chain disclosed fields shown explicitly next to a note on what stayed private

## 8. Success criteria for the demo

- A user can request a plan, get approved via a real ZK proof (not mocked), and see the plan created on-chain
- A user can pay installments and see paid count increase
- The demo can visibly show what data is public vs private (this is the actual pitch)

## 9. Open questions / deferred decisions

- How to source a real eligibility signal beyond a self-attested number (oracle, attestation, or reputation system) — deferred past MVP
- Upfront merchant payout via liquidity pool — v2
- Default handling and enforcement — v2, only if time remains after the happy path works

## 10. Tech stack

- Smart contract: Compact (Midnight)
- Frontend: Next.js
- Wallet: Lace via Midnight.js
- Local dev: Docker (node, indexer, proof server), Vitest-based contract simulator
- Deployment target: Midnight Preview testnet
