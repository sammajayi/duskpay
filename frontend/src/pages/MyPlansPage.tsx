import { decodeDescription } from '../lib/duskpay/description';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../lib/duskpay/WalletContext';
import {
  connectToDuskPay,
  getStoredContractAddress,
  listMyPlans,
  planIdToHex,
  readCurrentLedger,
  type PlanListEntry,
} from '../lib/duskpay/client';
import { starToNight } from '../lib/duskpay/night';

export default function MyPlansPage() {
  const { connection, callerAddressBytes, connect } = useWallet();
  const [plans, setPlans] = useState<PlanListEntry[] | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const address = getStoredContractAddress();
    if (!address || !callerAddressBytes) {
      setPlans([]);
      return;
    }
    try {
      const ledger = await readCurrentLedger(address);
      setPlans(ledger ? listMyPlans(ledger, callerAddressBytes) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
      setPlans([]);
    }
  }, [callerAddressBytes]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pay = async (planId: Uint8Array) => {
    if (!connection || !callerAddressBytes) return;
    const idHex = planIdToHex(planId);
    setPayingId(idHex);
    setError(null);
    try {
      const handle = await connectToDuskPay(connection, callerAddressBytes);
      await handle.callTx.payInstallment(planId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPayingId(null);
    }
  };

  if (!connection) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[#26262f] bg-[#15151f] p-4 text-sm text-[#a8a6b3]">
        <span>Connect your Lace wallet to see your plans.</span>
        <button
          onClick={connect}
          className="flex-shrink-0 rounded-lg border border-[#f2f0ea] bg-[#f2f0ea] px-3.5 py-1.5 text-xs font-semibold text-[#0a0a0f] transition-opacity hover:opacity-85"
        >
          Connect now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <span className="font-mono-sans text-xs font-semibold uppercase tracking-[0.14em] text-[#7c8cff]">
          Your plans
        </span>
        <h1 className="font-serif-display mt-2 text-[32px] font-medium">My plans</h1>
      </div>

      {error && (
        <p className="rounded-lg border border-[#3a1f22] bg-[#1a1116] p-3 text-sm text-[#ff7b72]">
          {error}
        </p>
      )}

      {plans === null && <p className="text-sm text-[#6f6d7a]">Loading…</p>}

      {plans?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#26262f] bg-[#111119] p-10 text-center">
          <p className="text-sm text-[#a8a6b3]">
            No plans yet.{' '}
            <Link to="/" className="text-[#7c8cff] underline underline-offset-2">
              Request one
            </Link>
            .
          </p>
        </div>
      )}

      <ul className="space-y-4">
        {plans?.map(({ planId, plan }) => {
          const idHex = planIdToHex(planId);
          const progress = Number(plan.paidCount) / Number(plan.installmentCount);
          const complete = plan.paidCount >= plan.installmentCount;

          return (
            <li
              key={idHex}
              className="rounded-2xl border border-[#1b1b24] bg-[#111119] p-5 transition-colors hover:border-[#26262f]"
            >
              <div className="flex items-center justify-between gap-4">
                <Link
                  to={`/plans/${idHex}`}
                  className="font-serif-display truncate text-lg font-medium hover:text-[#7c8cff]"
                >
                  {decodeDescription(plan.description) || `Plan ${idHex.slice(0, 8)}…`}
                </Link>
                <span className="flex-shrink-0 rounded-full border border-[#26262f] bg-[#15151f] px-2.5 py-1 text-xs text-[#a8a6b3]">
                  {plan.paidCount.toString()} / {plan.installmentCount.toString()} paid
                </span>
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#1b1b24]">
                <div
                  className={`h-full rounded-full ${complete ? 'bg-[#7ee787]' : 'bg-[#7c8cff]'}`}
                  style={{ width: `${Math.min(100, progress * 100)}%` }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-[#6f6d7a]">
                  {starToNight(plan.installmentAmount)} NIGHT / installment ·{' '}
                  {starToNight(plan.totalAmount)} NIGHT total
                </span>
                <button
                  onClick={() => pay(planId)}
                  disabled={complete || payingId === idHex}
                  className="rounded-full border border-[#f2f0ea] bg-[#f2f0ea] px-3.5 py-1.5 text-xs font-semibold text-[#0a0a0f] transition-opacity hover:opacity-85 disabled:border-[#26262f] disabled:bg-transparent disabled:text-[#6f6d7a] disabled:opacity-100"
                >
                  {complete ? 'Complete' : payingId === idHex ? 'Paying…' : 'Pay next'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
