/**
 * Generates a fresh Preview wallet for CLI deploys. Writes the hex seed to
 * contract/.wallet-seed (gitignored, mode 600) and prints only the address.
 * Usage: npx tsx scripts/gen-wallet.mts
 */
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { NetworkId } from '@midnight-ntwrk/zswap';
import { firstValueFrom } from 'rxjs';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';

const seedFile = path.join(import.meta.dirname, '..', '.wallet-seed');
if (existsSync(seedFile)) {
  console.error(`${seedFile} already exists — refusing to overwrite.`);
  process.exit(1);
}
const seed = randomBytes(32).toString('hex');
writeFileSync(seedFile, seed + '\n', { mode: 0o600 });

const wallet = await WalletBuilder.build(
  'https://indexer.preview.midnight.network/api/v4/graphql',
  'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
  'http://localhost:6300',
  'wss://rpc.preview.midnight.network',
  seed,
  NetworkId.TestNet,
);
const state: any = await firstValueFrom(wallet.state());
console.log('Address:', state.address);
await wallet.close();
process.exit(0);
