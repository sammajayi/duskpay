import { CompiledContract } from '@midnight-ntwrk/compact-js';
import {
  Contract,
  type Witnesses,
  type Ledger,
} from '../../../../contract/managed/contract/index.js';

/**
 * DuskPay has no persistent witness-backed private state of its own — the only
 * witness, `callerAddress`, derives the caller's address bytes from the
 * connected wallet on every call. Private state is therefore always `null`.
 */
export type DuskPayPrivateState = null;

export const DUSKPAY_PRIVATE_STATE_ID = 'duskpayPrivateState';

export type DuskPayCircuitId = 'checkEligibility' | 'requestPlan' | 'payInstallment' | 'checkStatus';

/**
 * Builds the witness implementation for a given 32-byte caller address
 * (derived from the connected wallet's unshielded public key).
 */
export const createWitnesses = (callerAddressBytes: Uint8Array): Witnesses<DuskPayPrivateState> => ({
  callerAddress: (context) => [context.privateState, callerAddressBytes],
});

export type DuskPayLedger = Ledger;

/**
 * The compiled contract binding, tagged so providers/tooling can identify it.
 * Witnesses are attached per-call site (see `getCompiledContract`) since they
 * depend on which wallet address is currently connected.
 */
export const makeCompiledContract = (callerAddressBytes: Uint8Array) =>
  CompiledContract.make<Contract<DuskPayPrivateState>, DuskPayPrivateState>('duskpay', Contract).pipe(
    CompiledContract.withWitnesses(createWitnesses(callerAddressBytes)),
    // Required to fully resolve the compiled contract's context type. Unused
    // at runtime here since ZK artifacts are actually served via the
    // `zkConfigProvider` (FetchZkConfigProvider) passed through providers.
    (c) => CompiledContract.withCompiledFileAssets(c, 'duskpay'),
  );

export { Contract as DuskPayContract, ledger as duskpayLedger } from '../../../../contract/managed/contract/index.js';
