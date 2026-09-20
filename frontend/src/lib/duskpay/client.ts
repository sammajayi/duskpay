import { deployContract, findDeployedContract, type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import {
  DUSKPAY_PRIVATE_STATE_ID,
  duskpayLedger,
  makeCompiledContract,
  type DuskPayContract,
  type DuskPayPrivateState,
  EMPTY_PRIVATE_STATE,
} from './contract';
import { createContractProviders, createDataProviders } from './providers';
import type { WalletConnection } from './wallet';
import { CONTRACT_ADDRESS_STORAGE_KEY, DEFAULT_CONTRACT_ADDRESS } from './config';

export type DuskPayHandle = FoundContract<DuskPayContract<DuskPayPrivateState>>;

export const getStoredContractAddress = (): string | null => {
  if (typeof window === 'undefined') return DEFAULT_CONTRACT_ADDRESS || null;
  return window.localStorage.getItem(CONTRACT_ADDRESS_STORAGE_KEY) ?? DEFAULT_CONTRACT_ADDRESS ?? null;
};

export const storeContractAddress = (address: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONTRACT_ADDRESS_STORAGE_KEY, address);
};

/**
 * Deploys a fresh DuskPay contract with the given eligibility threshold. Only
 * needed once per environment — the resulting address is cached in
 * localStorage and reused by `connectToDuskPay` on subsequent visits.
 */
export const deployDuskPay = async (
  connection: WalletConnection,
  callerAddressBytes: Uint8Array,
  eligibilityThreshold: bigint,
): Promise<DuskPayHandle> => {
  const providers = createContractProviders(connection);
  const compiledContract = makeCompiledContract(callerAddressBytes);

  const deployed = await deployContract<DuskPayContract<DuskPayPrivateState>>(providers, {
    compiledContract,
    privateStateId: DUSKPAY_PRIVATE_STATE_ID,
    initialPrivateState: EMPTY_PRIVATE_STATE,
    args: [eligibilityThreshold],
  });

  storeContractAddress(deployed.deployTxData.public.contractAddress as unknown as string);
  return deployed;
};

/**
 * Connects to the already-deployed DuskPay contract at the given (or
 * previously stored) address.
 */
export const connectToDuskPay = async (
  connection: WalletConnection,
  callerAddressBytes: Uint8Array,
  contractAddress?: string,
): Promise<DuskPayHandle> => {
  const address = contractAddress ?? getStoredContractAddress();
  if (!address) {
    throw new Error('No DuskPay contract address configured. Deploy the contract first.');
  }

  const providers = createContractProviders(connection);
  const compiledContract = makeCompiledContract(callerAddressBytes);

  return findDeployedContract<DuskPayContract<DuskPayPrivateState>>(providers, {
    compiledContract,
    contractAddress: address,
    privateStateId: DUSKPAY_PRIVATE_STATE_ID,
    initialPrivateState: EMPTY_PRIVATE_STATE,
  });
};

export const bytesEqual = (a: Uint8Array, b: Uint8Array): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export type PlanRecord = ReturnType<ReturnType<typeof duskpayLedger>['plans']['lookup']>;

export type PlanListEntry = { planId: Uint8Array; plan: PlanRecord };

/** Lists every plan in the ledger whose borrower matches `callerAddressBytes`. */
export const listMyPlans = (ledger: ReturnType<typeof duskpayLedger>, callerAddressBytes: Uint8Array): PlanListEntry[] => {
  const mine: PlanListEntry[] = [];
  for (const [planId, plan] of ledger.plans) {
    if (bytesEqual(plan.borrower.bytes, callerAddressBytes)) {
      mine.push({ planId, plan });
    }
  }
  return mine;
};

export const planIdToHex = (planId: Uint8Array): string =>
  Array.from(planId).map((b) => b.toString(16).padStart(2, '0')).join('');

export const hexToPlanId = (hex: string): Uint8Array => {
  const clean = hex.trim();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

/**
 * Reads the *current* on-chain ledger state for a deployed DuskPay contract
 * (not just the state at deploy time — this re-queries the indexer).
 */
export const readCurrentLedger = async (contractAddress: string) => {
  const { publicDataProvider } = createDataProviders();
  const state = await publicDataProvider.queryContractState(contractAddress as never);
  if (!state) return null;
  return duskpayLedger(state.data);
};

