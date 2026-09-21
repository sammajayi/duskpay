/**
 * Deploys the DuskPay contract from the CLI, without going through the
 * frontend's browser-wallet flow.
 *
 * Usage:
 *   WALLET_SEED=<hex seed> ELIGIBILITY_THRESHOLD=5000 npx tsx scripts/deploy.mts
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
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { UnshieldedWallet, createKeystore, PublicKey } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { filter, firstValueFrom } from 'rxjs';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
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

type DuskPayPrivateState = Record<string, never>;

// DuskPay's only witness derives the caller's address from the deploying
// wallet's own coin public key — there's no persisted private state.
const createWitnesses = (callerAddressBytes: Uint8Array): Witnesses<DuskPayPrivateState> => ({
  callerAddress: (context) => [context.privateState, callerAddressBytes],
});

async function main() {
  setNetworkId('preview');
  const seedBytes = Buffer.from(WALLET_SEED!, 'hex');
  const hd = HDWallet.fromSeed(seedBytes);
  if (hd.type !== 'seedOk') throw hd.error;
  const derived = hd.hdWallet.selectAccount(0).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust] as const).deriveKeysAt(0);
  if (derived.type !== 'keysDerived') throw new Error('HD key derivation out of bounds');
  hd.hdWallet.clear();

  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(derived.keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(derived.keys[Roles.Dust]);
  const keystore = createKeystore(derived.keys[Roles.NightExternal], 'preview');

  const configuration = {
    networkId: 'preview',
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
    relayURL: new URL(NODE_URL),
    provingServerUrl: new URL(PROOF_SERVER_URL),
    indexerClientConnection: { indexerHttpUrl: INDEXER_HTTP_URL, indexerWsUrl: INDEXER_WS_URL },
    txHistoryStorage: undefined,
  } as never;

  const wallet = await WalletFacade.init({
    configuration,
    shielded: (cfg: never) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg: never) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(keystore)),
    dust: (cfg: never) =>
      DustWallet(cfg).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
  } as never);
  await wallet.start(shieldedSecretKeys, dustSecretKey);

  console.log('Syncing wallet with Preview...');
  let state = await wallet.waitForSyncedState();
  console.log(`Unshielded address: ${keystore.getBech32Address().toString()}`);
  console.log(`NIGHT balance: ${JSON.stringify(state.unshielded.balances, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))}`);

  // Fees are paid in DUST, which is generated by NIGHT UTXOs once they're registered for it.
  if (state.dust.balance(new Date()) === 0n) {
    const nightUtxos = state.unshielded.availableCoins.filter((c: any) => c.meta.registeredForDustGeneration === false);
    if (nightUtxos.length === 0) throw new Error('No DUST and no unregistered NIGHT UTXOs — is the wallet funded yet?');
    console.log(`Registering ${nightUtxos.length} NIGHT UTXO(s) for DUST generation...`);
    const recipe = await wallet.registerNightUtxosForDustGeneration(
      nightUtxos,
      keystore.getPublicKey(),
      (payload: Uint8Array) => keystore.signData(payload),
    );
    const finalized = await wallet.finalizeRecipe(recipe);
    await wallet.submitTransaction(finalized);
    console.log('Waiting for DUST to accrue...');
    state = await firstValueFrom(
      wallet.state().pipe(filter((st: any) => st.isSynced && st.dust.balance(new Date()) > 0n)),
    );
  }
  console.log(`DUST balance: ${state.dust.balance(new Date())}`);

  const callerAddressBytes = Buffer.from(state.shielded.coinPublicKey.toHexString(), 'hex').subarray(0, 32);
  const secretKeys = { shieldedSecretKeys, dustSecretKey };

  const walletProvider = {
    getCoinPublicKey: () => state.shielded.coinPublicKey.toHexString() as never,
    getEncryptionPublicKey: () => state.shielded.encryptionPublicKey.toHexString() as never,
    balanceTx: async (tx: never, ttl?: Date) => {
      const recipe = await wallet.balanceUnboundTransaction(tx, secretKeys, {
        ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000),
      });
      return (await wallet.finalizeRecipe(recipe)) as never;
    },
  };

  const midnightProvider = {
    submitTx: async (tx: never) => (await wallet.submitTransaction(tx)) as never,
  };

  const zkConfigProvider = new NodeZkConfigProvider<string>(path.join(import.meta.dirname, '..', 'managed'));

  const providers = {
    walletProvider,
    midnightProvider,
    publicDataProvider: indexerPublicDataProvider(INDEXER_HTTP_URL, INDEXER_WS_URL),
    proofProvider: httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider),
    zkConfigProvider,
    privateStateProvider: levelPrivateStateProvider<string, DuskPayPrivateState>({
      privateStoragePasswordProvider: async () => 'DuskPay-Cli-Deploy-2026!',
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
    initialPrivateState: {},
    args: [threshold],
  } as never);

  console.log(`Deployed. Contract address: ${deployed.deployTxData.public.contractAddress}`);
  console.log('Set this as VITE_CONTRACT_ADDRESS in frontend/.env to use it from the UI.');

  await wallet.stop();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
