import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import type { MidnightProvider, WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { INDEXER_HTTP_URL, INDEXER_WS_URL, NETWORK_ID, PROOF_SERVER_URL } from './config';
import type { WalletConnection } from './wallet';
import type { DuskPayCircuitId, DuskPayPrivateState } from './contract';

// midnight-js throws "Network ID has not been configured" on any contract
// operation until this is set. Do it once at module load, before any provider is used.
setNetworkId(NETWORK_ID);

/**
 * Adapts the Lace `ConnectedAPI` (string-serialized transactions) to the
 * `WalletProvider` / `MidnightProvider` interfaces expected by
 * `@midnight-ntwrk/midnight-js-contracts`, which operate on the SDK's
 * `Transaction` objects. Both sides agree on the wire format being the
 * transaction's serialized string form, so we round-trip through
 * `tx.serialize()` / treat the wallet's response string as already-finalized.
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
      const serialized = typeof tx === 'string' ? tx : String(tx);
      const { tx: balanced } = await api.balanceUnsealedTransaction(serialized);
      return balanced as unknown as Awaited<ReturnType<WalletProvider['balanceTx']>>;
    },
  };

  const midnightProvider: MidnightProvider = {
    submitTx: async (tx) => {
      const serialized = typeof tx === 'string' ? tx : String(tx);
      await api.submitTransaction(serialized);
      // Lace's submitTransaction resolves with no payload; the transaction's
      // own identifier is derivable from the serialized tx by callers that
      // need it (e.g. via the indexer once the tx lands in a block).
      return serialized as unknown as Awaited<ReturnType<MidnightProvider['submitTx']>>;
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
