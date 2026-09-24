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

  const totalNum = Number(totalAmount);
  const countNum = Number(installmentCount) || 0;
  const perInstallment = totalNum > 0 && countNum > 0 ? totalNum / countNum : null;

  return (
    <div className="space-y-8">
      <div>
        <span className="font-mono-sans text-xs font-semibold uppercase tracking-[0.14em] text-[#7c8cff]">
          New plan
        </span>
        <h1 className="font-serif-display mt-2 text-[32px] font-medium">Request a plan</h1>
        <p className="mt-2 max-w-md text-[15px] leading-[1.6] text-[#a8a6b3]">
          Split a purchase into installments. Your eligibility input never leaves your device as a
          raw value — only a pass/fail proof is published on-chain.
        </p>
      </div>

      {!connection && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#26262f] bg-[#15151f] p-4 text-sm text-[#a8a6b3]">
          <span>Connect your Lace wallet to request a plan.</span>
          <button
            onClick={connect}
            className="flex-shrink-0 rounded-lg border border-[#f2f0ea] bg-[#f2f0ea] px-3.5 py-1.5 text-xs font-semibold text-[#0a0a0f] transition-opacity hover:opacity-85"
          >
            Connect now
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="space-y-5 rounded-2xl border border-[#1b1b24] bg-[#111119] p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6f6d7a]">
            Purchase details
          </h2>

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
            <p className="mt-1.5 text-xs text-[#6f6d7a]">
              Shown on your plan. This is stored on-chain, so it is public — don't include
              personal details.
            </p>
          </Field>

          <div className="grid grid-cols-2 gap-4">
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

            <Field label="Installments">
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
          </div>

          {perInstallment !== null && (
            <div className="flex items-center justify-between rounded-lg border border-[#26262f] bg-[#15151f] px-4 py-3 text-sm">
              <span className="text-[#a8a6b3]">You'll pay</span>
              <span className="font-serif-display text-[#f2f0ea]">
                {perInstallment.toLocaleString(undefined, { maximumFractionDigits: 6 })} NIGHT
                <span className="ml-1.5 text-sm font-normal text-[#6f6d7a]">
                  × {countNum || 0}
                </span>
              </span>
            </div>
          )}
        </section>

        <section className="space-y-5 rounded-2xl border border-dashed border-[#3a2f5c] bg-[#15151a] p-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c8cff]">
              Eligibility · stays private
            </h2>
            <p className="mt-1.5 text-xs leading-[1.6] text-[#6f6d7a]">
              This value is proved locally against a sealed threshold. Only the pass/fail result
              is ever published on-chain — never the number itself.
            </p>
          </div>

          <Field label="Private eligibility input">
            <input
              required
              type="number"
              min={0}
              value={privateInput}
              onChange={(e) => setPrivateInput(e.target.value)}
              className="input"
            />
            <p className="mt-1.5 text-xs text-[#6f6d7a]">e.g. income or credit signal.</p>
          </Field>

          <Field label="Eligibility threshold (contract deploy only, first plan)">
            <input
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="input"
            />
            <p className="mt-1.5 text-xs text-[#6f6d7a]">
              Only used the very first time DuskPay is deployed in this environment. Ignored once
              a contract already exists.
            </p>
          </Field>
        </section>

        <button
          type="submit"
          disabled={status === 'proving'}
          className="w-full rounded-lg border border-[#f2f0ea] bg-[#f2f0ea] py-3 font-mono-sans text-[15px] font-semibold text-[#0a0a0f] transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {status === 'proving' ? 'Generating proof…' : connection ? 'Request plan' : 'Connect wallet to continue'}
        </button>

        {errorMsg && (
          <p className="rounded-lg border border-[#3a1f22] bg-[#1a1116] p-3 text-sm text-[#ff7b72]">
            {errorMsg}
          </p>
        )}
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-[#a8a6b3]">{label}</span>
      {children}
    </label>
  );
}
