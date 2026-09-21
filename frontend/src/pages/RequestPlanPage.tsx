import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../lib/duskpay/WalletContext';
import { connectToDuskPay, deployDuskPay, getStoredContractAddress, planIdToHex } from '../lib/duskpay/client';
import { nightToStar } from '../lib/duskpay/night';
import { DESCRIPTION_BYTES, encodeDescription } from '../lib/duskpay/description';
import { MidnightBech32m, UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { NETWORK_ID } from '../lib/duskpay/config';

const randomPlanId = (): Uint8Array => crypto.getRandomValues(new Uint8Array(32));

/**
 * Parses a 32-byte hex address, rejecting anything that isn't actually
 * valid hex — silently zero-filling a typo'd address (the previous
 * behavior) means funds could go to an address nobody controls, with no
 * indication anything was wrong until the merchant never gets paid.
 */
const hexToBytes32 = (input: string): Uint8Array => {
  const trimmed = input.trim();
  // Lace shows unshielded addresses as bech32m (mn_addr_preview1…); decode
  // those, which also rejects an address for the wrong network or a bad checksum.
  if (trimmed.startsWith('mn_addr')) {
    try {
      const decoded = MidnightBech32m.parse(trimmed).decode(UnshieldedAddress, NETWORK_ID);
      return new Uint8Array(decoded.data);
    } catch (err) {
      const reason = err instanceof Error ? `: ${err.message}` : '';
      throw new Error(
        `Not a valid unshielded address for the ${NETWORK_ID} network (expected mn_addr_${NETWORK_ID}1…)${reason}`,
      );
    }
  }
  const clean = trimmed.replace(/^0x/, '');
  if (!/^[0-9a-fA-F]{1,64}$/.test(clean)) {
    throw new Error(
      'Merchant address must be an mn_addr_… address or a hex string (up to 64 hex characters, optionally 0x-prefixed)',
    );
  }
  const padded = clean.padStart(64, '0');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  return bytes;
};

export default function RequestPlanPage() {
  const { connection, callerAddressBytes, connect } = useWallet();
  const navigate = useNavigate();

  const [merchantAddress, setMerchantAddress] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('4');
  const [privateInput, setPrivateInput] = useState('');
  const [threshold, setThreshold] = useState('5000');

  const [status, setStatus] = useState<'idle' | 'proving' | 'error' | 'done'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connection || !callerAddressBytes) {
      await connect();
      return;
    }

    setStatus('proving');
    setErrorMsg(null);

    try {
      const total = nightToStar(totalAmount);
      if (total <= 0n) {
        throw new Error('Total amount must be greater than 0');
      }

      const count = BigInt(installmentCount);
      if (count <= 0n) {
        throw new Error('Number of installments must be at least 1');
      }

      const installmentAmount = total / count;
      if (installmentAmount <= 0n) {
        throw new Error('Total amount is too small to split across that many installments');
      }

      const merchantBytes = hexToBytes32(merchantAddress);
      const descriptionBytes = encodeDescription(description);
      const privateValue = BigInt(privateInput);

      // If an address is configured, connect to it and let any failure surface
      // as-is — silently deploying a fresh contract on error would hide the real problem.
      let handle = getStoredContractAddress()
        ? await connectToDuskPay(connection, callerAddressBytes)
        : null;

      if (!handle) {
        // No contract deployed in this environment yet — deploy one, using
        // the borrower-supplied threshold as the contract's eligibility bar.
        handle = await deployDuskPay(connection, callerAddressBytes, BigInt(threshold));
      }

      const planId = randomPlanId();

      await handle.callTx.requestPlan(
        planId,
        { bytes: merchantBytes },
        total,
        installmentAmount,
        count,
        descriptionBytes,
        privateValue,
      );

      setStatus('done');
      navigate(`/plans/${planIdToHex(planId)}`);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Request a plan</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Split a purchase into installments. Your eligibility input never leaves your device as a
          raw value — only a pass/fail proof is published on-chain.
        </p>
      </div>

      {!connection && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
          Connect your Lace wallet to request a plan.
          <button onClick={connect} className="ml-2 underline">
            Connect now
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Merchant address">
          <input
            required
            value={merchantAddress}
            onChange={(e) => setMerchantAddress(e.target.value)}
            placeholder="mn_addr_preview1… or 0x…"
            className="input"
          />
        </Field>

        <Field label="What is this payment for?">
          <input
            required
            type="text"
            maxLength={DESCRIPTION_BYTES}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Payment for iPhone 18"
            className="input"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Shown on your plan. This is stored on-chain, so it is public — don't include personal details.
          </p>
        </Field>

        <Field label="Total amount (NIGHT)">
          <input
            required
            type="number"
            min={0}
            step="any"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="e.g. 12.5"
            className="input"
          />
        </Field>

        <Field label="Number of installments">
          <input
            required
            type="number"
            min={1}
            max={24}
            value={installmentCount}
            onChange={(e) => setInstallmentCount(e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Eligibility threshold (contract deploy only, first plan)">
          <input
            type="number"
            min={0}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="input"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Only used the very first time DuskPay is deployed in this environment. Ignored once a
            contract already exists.
          </p>
        </Field>

        <Field label="Private eligibility input">
          <input
            required
            type="number"
            min={0}
            value={privateInput}
            onChange={(e) => setPrivateInput(e.target.value)}
            className="input"
          />
          <p className="mt-1 text-xs text-neutral-500">
            e.g. income or credit signal. Stays private — only the pass/fail result is recorded
            on-chain.
          </p>
        </Field>

        <button
          type="submit"
          disabled={status === 'proving'}
          className="w-full rounded-lg bg-white py-2 font-medium text-black disabled:opacity-50"
        >
          {status === 'proving' ? 'Generating proof…' : 'Request plan'}
        </button>

        {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-neutral-300">{label}</span>
      {children}
    </label>
  );
}
