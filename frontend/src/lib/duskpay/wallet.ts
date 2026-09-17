import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { NETWORK_ID } from './config';

const LACE_RDNS_CANDIDATES = ['mnLace', 'midnight-lace', 'lace'];

export type WalletConnection = {
  api: ConnectedAPI;
  coinPublicKey: string;
  encryptionPublicKey: string;
  unshieldedAddress: string;
};

/**
 * Derives the 32-byte address the contract uses to identify the caller
 * (`callerAddress` witness). We hash the wallet's unshielded address string
 * down to 32 bytes with SHA-256 via SubtleCrypto, which is available in every
 * browser that can run a Midnight dApp.
 */
export const deriveCallerAddressBytes = async (unshieldedAddress: string): Promise<Uint8Array> => {
  const encoded = new TextEncoder().encode(unshieldedAddress);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return new Uint8Array(digest);
};

export const isLaceAvailable = (): boolean => {
  if (typeof window === 'undefined' || !window.midnight) return false;
  return LACE_RDNS_CANDIDATES.some((key) => key in window.midnight!);
};

const findLaceInitialApi = () => {
  if (typeof window === 'undefined' || !window.midnight) return undefined;
  for (const key of LACE_RDNS_CANDIDATES) {
    if (window.midnight[key]) return window.midnight[key];
  }
  // Fall back to the first injected wallet, in case Lace uses a different key.
  const firstKey = Object.keys(window.midnight)[0];
  return firstKey ? window.midnight[firstKey] : undefined;
};

export const connectWallet = async (): Promise<WalletConnection> => {
  const initialApi = findLaceInitialApi();
  if (!initialApi) {
    throw new Error('No Midnight wallet found. Install the Lace wallet extension and refresh.');
  }

  const api = await initialApi.connect(NETWORK_ID);

  const [{ shieldedCoinPublicKey, shieldedEncryptionPublicKey }, { unshieldedAddress }] = await Promise.all([
    api.getShieldedAddresses(),
    api.getUnshieldedAddress(),
  ]);

  return {
    api,
    coinPublicKey: shieldedCoinPublicKey,
    encryptionPublicKey: shieldedEncryptionPublicKey,
    unshieldedAddress,
  };
};
