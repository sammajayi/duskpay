import { decodeDescription } from '../lib/duskpay/description';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '../lib/duskpay/WalletContext';
import { connectToDuskPay, getStoredContractAddress, hexToPlanId, readCurrentLedger } from '../lib/duskpay/client';
import type { PlanRecord } from '../lib/duskpay/client';
import { starToNight } from '../lib/duskpay/night';

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { connection, callerAddressBytes, connect } = useWallet();

  const [plan, setPlan] = useState<PlanRecord | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    const address = getStoredContractAddress();
    if (!address || !id) {
      setPlan(null);
      return;
    }
    try {
      const ledger = await readCurrentLedger(address);
      const planId = hexToPlanId(id);
      if (!ledger || !ledger.plans.member(planId)) {
        setPlan(null);
        return;
      }
      setPlan(ledger.plans.lookup(planId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan');
      setPlan(null);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pay = async () => {
    if (!connection || !callerAddressBytes || !id) return;
    setPaying(true);
    setError(null);
    try {
      const handle = await connectToDuskPay(connection, callerAddressBytes);
      await handle.callTx.payInstallment(hexToPlanId(id));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (plan === undefined) return <p className="text-sm text-neutral-400">Loading…</p>;
  if (plan === null) return <p className="text-sm text-neutral-400">Plan not found.</p>;

  const complete = plan.paidCount >= plan.installmentCount;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Plan detail</h1>

      <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
          On-chain (public)
        </h2>
        <dl className="space-y-2 text-sm">
          <Row label="Description" value={decodeDescription(plan.description) || '—'} />
          <Row label="Borrower" value={hex(plan.borrower.bytes)} />
          <Row label="Merchant" value={hex(plan.merchant.bytes)} />
          <Row label="Total amount" value={`${starToNight(plan.totalAmount)} NIGHT`} />
          <Row label="Installment amount" value={`${starToNight(plan.installmentAmount)} NIGHT`} />
          <Row label="Installments paid" value={`${plan.paidCount} / ${plan.installmentCount}`} />
          <Row label="Eligibility check" value={plan.eligibilityResult ? 'Passed' : 'Failed'} />
        </dl>
      </section>

      <section className="rounded-lg border border-dashed border-neutral-700 bg-neutral-950 p-4">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-neutral-400">
          Stayed private
        </h2>
        <p className="text-sm text-neutral-400">
          The raw value used to check eligibility (e.g. income or credit signal) was never sent
          on-chain. Only the pass/fail <span className="text-neutral-200">Eligibility check</span>{' '}
          result above is public — the number itself was consumed locally inside a zero-knowledge
          proof.
        </p>
      </section>

      {!complete && (
        <button
          onClick={connection ? pay : connect}
          disabled={paying}
          className="w-full rounded-lg bg-white py-2 font-medium text-black disabled:opacity-50"
        >
          {!connection ? 'Connect wallet to pay' : paying ? 'Paying…' : 'Pay next installment'}
        </button>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-neutral-400">{label}</dt>
      <dd className="truncate font-mono text-xs text-neutral-200">{value}</dd>
    </div>
  );
}

function hex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
