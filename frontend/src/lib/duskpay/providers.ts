import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import type { MidnightProvider, WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { Transaction } from '@midnight-ntwrk/ledger-v8';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { INDEXER_HTTP_URL, INDEXER_WS_URL, NETWORK_ID, PROOF_SERVER_URL } from './config';
import type { WalletConnection } from './wallet';
import type { DuskPayCircuitId, DuskPayPrivateState } from './contract';

// midnight-js throws "Network ID has not been configured" on any contract
// operation until this is set. Do it once at module load, before any provider is used.
setNetworkId(NETWORK_ID);

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array => {
  const clean = hex.trim().replace(/^0x/, '');
  if (clean.length === 0 || clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error(`Wallet returned a transaction that is not valid hex (length ${clean.length})`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
};

/**
 * Adapts the Lace `ConnectedAPI` to the `WalletProvider` / `MidnightProvider`
 * interfaces expected by `@midnight-ntwrk/midnight-js-contracts`.
 *
 * The two sides speak different types: midnight-js works on ledger
 * `Transaction` objects, while the DApp connector exchanges hex-encoded
 * serialized transactions. So we serialize on the way out and deserialize the
 * wallet's reply. `balanceUnsealedTransaction` takes a proven, pre-binding
 * transaction and returns a balanced, sealed (bound) one ready to submit.
 */
export const createWalletProviders = (
  connection: WalletConnection,
): { walletProvider: WalletProvider; midnightProvider: MidnightProvider } => {
  const { api, coinPublicKey, encryptionPublicKey } = connection;

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => coinPublicKey as unknown as ReturnType<WalletProvider['getCoinPublicKey']>,
    getEncryptionPublicKey: () =>
      encryptionPublicKey as unknown as ReturnType<WalletProvider['getEncryptionPublicKey']>,
    balanceTx: async (tx, _ttl) => {
      const { tx: balancedHex } = await api.balanceUnsealedTransaction(toHex(tx.serialize()));
      return Transaction.deserialize(
        'signature',
        'proof',
        'binding',
        fromHex(balancedHex),
      ) as unknown as Awaited<ReturnType<WalletProvider['balanceTx']>>;
    },
  };

  const midnightProvider: MidnightProvider = {
    submitTx: async (tx) => {
      await api.submitTransaction(toHex(tx.serialize()));
      // Lace's submitTransaction resolves with no payload, so take the id from the transaction itself.
      return tx.identifiers()[0];
    },
  };

  return { walletProvider, midnightProvider };
};

export const createDataProviders = <PCK extends string = DuskPayCircuitId>() => {
  // FetchZkConfigProvider stores fetchFunc on itself and calls it as a method,
  // so handing it the bare browser `fetch` throws "Illegal invocation". Wrap it.
  const zkConfigProvider = new FetchZkConfigProvider<PCK>(
    typeof window !== 'undefined' ? `${window.location.origin}/zk` : 'http://localhost:3000/zk',
    (input, init) => fetch(input, init),
  );

  return {
    publicDataProvider: indexerPublicDataProvider(INDEXER_HTTP_URL, INDEXER_WS_URL),
    proofProvider: httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider),
    zkConfigProvider,
    privateStateProvider: levelPrivateStateProvider<string, DuskPayPrivateState>({
      // The store enforces a password policy (3 of: upper, lower, digit, special).
      // DuskPay's private state is an empty placeholder, so nothing sensitive is encrypted here.
      privateStoragePasswordProvider: async () => 'DuskPay-Local-Dev-2026!',
      accountId: 'duskpay',
    }),
  };
};

export const createContractProviders = (connection: WalletConnection) => {
  const { walletProvider, midnightProvider } = createWalletProviders(connection);
  return { ...createDataProviders(), walletProvider, midnightProvider };
};
