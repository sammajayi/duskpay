/**
 * Deploys the DuskPay contract from the CLI, without going through the
 * frontend's browser-wallet flow.
 *
 * Usage:
 *   WALLET_SEED=<hex seed> ELIGIBILITY_THRESHOLD=5000 npx tsx scripts/deploy.ts
 *
 * Required env:
 *   WALLET_SEED             BIP32-compatible hex seed for a funded wallet.
 *                            Never commit a real seed — pass it as an env var.
 * Optional env (default to the public Preview testnet):
 *   NODE_URL                default: wss://rpc.preview.midnight.network
 *   INDEXER_HTTP_URL        default: https://indexer.preview.midnight.network/api/v4/graphql
 *   INDEXER_WS_URL          default: wss://indexer.preview.midnight.network/api/v4/graphql/ws
 *   PROOF_SERVER_URL        default: http://localhost:6300 (proving always runs locally)
 *   ELIGIBILITY_THRESHOLD   default: 5000 — the contract's constructor argument
 *
 * Caveat: this uses @midnight-ntwrk/wallet (the standalone Node wallet SDK),
 * which is a separate package generation from @midnight-ntwrk/midnight-js-*
 * (see README's Troubleshooting section for the same class of version-skew
 * issue on the frontend side). This script has been type-checked but not
 * run end-to-end against a funded wallet — if WalletBuilder's output doesn't
 * line up with what deployContract expects, that's the first place to look.
 */
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { NetworkId } from '@midnight-ntwrk/zswap';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { firstValueFrom } from 'rxjs';
import * as path from 'node:path';
import { Contract, type Witnesses } from '../managed/contract/index.js';

const {
  WALLET_SEED,
  NODE_URL = 'wss://rpc.preview.midnight.network',
  INDEXER_HTTP_URL = 'https://indexer.preview.midnight.network/api/v4/graphql',
  INDEXER_WS_URL = 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
  PROOF_SERVER_URL = 'http://localhost:6300',
  ELIGIBILITY_THRESHOLD = '5000',
} = process.env;

if (!WALLET_SEED) {
  console.error('WALLET_SEED env var is required (a funded wallet seed for the target network).');
  process.exit(1);
}

type DuskPayPrivateState = null;

// DuskPay's only witness derives the caller's address from the deploying
// wallet's own coin public key — there's no persisted private state.
const createWitnesses = (callerAddressBytes: Uint8Array): Witnesses<DuskPayPrivateState> => ({
  callerAddress: (context) => [context.privateState, callerAddressBytes],
});

async function main() {
  const wallet = await WalletBuilder.build(
    INDEXER_HTTP_URL,
    INDEXER_WS_URL,
    PROOF_SERVER_URL,
    NODE_URL,
    WALLET_SEED!,
    NetworkId.TestNet, // covers Preview/Preprod — see zswap's NetworkId enum
  );
  wallet.start();

  const state = await firstValueFrom(wallet.state());
  console.log(`Deploying from wallet address: ${state.address}`);

  const callerAddressBytes = Buffer.from(state.coinPublicKey.replace(/^mn_shield-cpk[^_]*_/, ''), 'hex').subarray(0, 32);

  const walletProvider = {
    getCoinPublicKey: () => state.coinPublicKey as never,
    getEncryptionPublicKey: () => state.encryptionPublicKey as never,
    balanceTx: async (tx: never, _ttl?: Date) => {
      const recipe = await wallet.balanceTransaction(tx as never, []);
      if (recipe.type === 'NothingToProve') return recipe.transaction as never;
      return (await wallet.proveTransaction(recipe)) as never;
    },
  };

  const midnightProvider = {
    submitTx: async (tx: never) => (await wallet.submitTransaction(tx as never)) as never,
  };

  const zkConfigProvider = new NodeZkConfigProvider<string>(path.join(import.meta.dirname, '..', 'managed'));

  const providers = {
    walletProvider,
    midnightProvider,
    publicDataProvider: indexerPublicDataProvider(INDEXER_HTTP_URL, INDEXER_WS_URL),
    proofProvider: httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider),
    zkConfigProvider,
    privateStateProvider: levelPrivateStateProvider<string, DuskPayPrivateState>({
      privateStoragePasswordProvider: async () => 'duskpay-cli-deploy',
      accountId: 'duskpay-deploy',
    }),
  };

  const compiledContract = CompiledContract.make<Contract<DuskPayPrivateState>, DuskPayPrivateState>(
    'duskpay',
    Contract,
  ).pipe(CompiledContract.withWitnesses(createWitnesses(callerAddressBytes)));

  const threshold = BigInt(ELIGIBILITY_THRESHOLD);
  console.log(`Deploying DuskPay with eligibilityThreshold = ${threshold}...`);

  const deployed = await deployContract(providers as never, {
    compiledContract,
    privateStateId: 'duskpayPrivateState',
    initialPrivateState: null,
    args: [threshold],
  } as never);

  console.log(`Deployed. Contract address: ${deployed.deployTxData.public.contractAddress}`);
  console.log('Set this as VITE_CONTRACT_ADDRESS in frontend/.env to use it from the UI.');

  await wallet.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
