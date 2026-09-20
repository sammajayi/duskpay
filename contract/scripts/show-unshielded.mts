/** Prints the unshielded (mn_addr_...) address for contract/.wallet-seed. */
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { createKeystore, PublicKey } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const seed = readFileSync(path.join(import.meta.dirname, '..', '.wallet-seed'), 'utf8').trim();
const hd = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
if (hd.type !== 'seedOk') throw hd.error;
const key = hd.hdWallet.selectAccount(0).selectRole(Roles.NightExternal).deriveKeyAt(0);
if (key.type !== 'keyDerived') throw new Error('key out of bounds');
const ks = createKeystore(key.key, 'preview' as never);
console.log(ks.getBech32Address().toString());
