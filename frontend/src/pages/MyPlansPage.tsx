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
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
        Connect your Lace wallet to see your plans.
        <button onClick={connect} className="ml-2 underline">
          Connect now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My plans</h1>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {plans === null && <p className="text-sm text-neutral-400">Loading…</p>}

      {plans?.length === 0 && (
        <p className="text-sm text-neutral-400">
          No plans yet. <Link to="/" className="underline">Request one</Link>.
        </p>
      )}

      <ul className="space-y-3">
        {plans?.map(({ planId, plan }) => {
          const idHex = planIdToHex(planId);
          const progress = Number(plan.paidCount) / Number(plan.installmentCount);
          const complete = plan.paidCount >= plan.installmentCount;

          return (
            <li key={idHex} className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex items-center justify-between">
                <Link to={`/plans/${idHex}`} className="font-medium hover:underline">
                  {decodeDescription(plan.description) || `Plan ${idHex.slice(0, 8)}…`}
                </Link>
                <span className="text-sm text-neutral-400">
                  {plan.paidCount.toString()} / {plan.installmentCount.toString()} paid
                </span>
              </div>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full bg-white"
                  style={{ width: `${Math.min(100, progress * 100)}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-neutral-400">
                <span>
                  {starToNight(plan.installmentAmount)} NIGHT per installment ·{' '}
                  {starToNight(plan.totalAmount)} NIGHT total
                </span>
                <button
                  onClick={() => pay(planId)}
                  disabled={complete || payingId === idHex}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-black disabled:opacity-40"
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
