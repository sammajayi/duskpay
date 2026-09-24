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

  if (plan === undefined) return <p className="text-sm text-[#6f6d7a]">Loading…</p>;
  if (plan === null) return <p className="text-sm text-[#6f6d7a]">Plan not found.</p>;

  const complete = plan.paidCount >= plan.installmentCount;
  const progress = Number(plan.paidCount) / Number(plan.installmentCount);

  return (
    <div className="space-y-8">
      <div>
        <span className="font-mono-sans text-xs font-semibold uppercase tracking-[0.14em] text-[#7c8cff]">
          Plan detail
        </span>
        <h1 className="font-serif-display mt-2 text-[28px] font-medium">
          {decodeDescription(plan.description) || 'Untitled plan'}
        </h1>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-[#1b1b24]">
            <div
              className={`h-full rounded-full ${complete ? 'bg-[#7ee787]' : 'bg-[#7c8cff]'}`}
              style={{ width: `${Math.min(100, progress * 100)}%` }}
            />
          </div>
          <span className="text-sm text-[#a8a6b3]">
            {plan.paidCount.toString()} / {plan.installmentCount.toString()} paid
          </span>
        </div>
      </div>

      <section className="rounded-2xl border border-[#1b1b24] bg-[#111119] p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#6f6d7a]">
          On-chain (public)
        </h2>
        <dl className="space-y-3 text-sm">
          <Row label="Borrower" value={hex(plan.borrower.bytes)} />
          <Row label="Merchant" value={hex(plan.merchant.bytes)} />
          <Row label="Total amount" value={`${starToNight(plan.totalAmount)} NIGHT`} />
          <Row label="Installment amount" value={`${starToNight(plan.installmentAmount)} NIGHT`} />
          <Row label="Installments paid" value={`${plan.paidCount} / ${plan.installmentCount}`} />
          <Row
            label="Eligibility check"
            value={plan.eligibilityResult ? 'Passed' : 'Failed'}
            accent={plan.eligibilityResult ? '#7ee787' : '#ff7b72'}
          />
        </dl>
      </section>

      <section className="rounded-2xl border border-dashed border-[#3a2f5c] bg-[#15151a] p-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7c8cff]">
          Stayed private
        </h2>
        <p className="text-sm leading-[1.6] text-[#a8a6b3]">
          The raw value used to check eligibility (e.g. income or credit signal) was never sent
          on-chain. Only the pass/fail <span className="text-[#f2f0ea]">eligibility check</span>{' '}
          result above is public — the number itself was consumed locally inside a zero-knowledge
          proof.
        </p>
      </section>

      {!complete && (
        <button
          onClick={connection ? pay : connect}
          disabled={paying}
          className="w-full rounded-lg border border-[#f2f0ea] bg-[#f2f0ea] py-3 font-mono-sans text-[15px] font-semibold text-[#0a0a0f] transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {!connection ? 'Connect wallet to pay' : paying ? 'Paying…' : 'Pay next installment'}
        </button>
      )}

      {error && (
        <p className="rounded-lg border border-[#3a1f22] bg-[#1a1116] p-3 text-sm text-[#ff7b72]">
          {error}
        </p>
      )}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[#6f6d7a]">{label}</dt>
      <dd
        className="truncate font-mono-sans text-xs"
        style={{ color: accent ?? '#f2f0ea' }}
      >
        {value}
      </dd>
    </div>
  );
}

function hex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
