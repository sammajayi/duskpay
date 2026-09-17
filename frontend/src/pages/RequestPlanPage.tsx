import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../lib/duskpay/WalletContext';
import { connectToDuskPay, deployDuskPay, getStoredContractAddress, planIdToHex } from '../lib/duskpay/client';

const randomPlanId = (): Uint8Array => crypto.getRandomValues(new Uint8Array(32));

const hexToBytes32 = (hex: string): Uint8Array => {
  const clean = hex.trim().replace(/^0x/, '').padStart(64, '0').slice(-64);
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  return bytes;
};

export default function RequestPlanPage() {
  const { connection, callerAddressBytes, connect } = useWallet();
  const navigate = useNavigate();

  const [merchantAddress, setMerchantAddress] = useState('');
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
      const total = BigInt(totalAmount);
      const count = BigInt(installmentCount);
      const installmentAmount = total / count;
      const merchantBytes = hexToBytes32(merchantAddress);
      const privateValue = BigInt(privateInput);

      let handle = getStoredContractAddress()
        ? await connectToDuskPay(connection, callerAddressBytes).catch(() => null)
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
        <Field label="Merchant address (hex)">
          <input
            required
            value={merchantAddress}
            onChange={(e) => setMerchantAddress(e.target.value)}
            placeholder="0x…"
            className="input"
          />
        </Field>

        <Field label="Total amount">
          <input
            required
            type="number"
            min={1}
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
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
