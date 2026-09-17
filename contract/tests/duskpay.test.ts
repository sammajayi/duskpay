import { describe, it, expect, beforeEach } from 'vitest';
import * as RT from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger } from '../managed/contract/index.js';

const COIN = '0'.repeat(64);
const ADDR = RT.sampleContractAddress();
const THRESHOLD = 5000n;

const createContext = (secretKey: Uint8Array = new Uint8Array(32)) => {
  const contract = new Contract({
    callerAddress: () => [secretKey, secretKey],
  });

  const ctor = contract.initialState(
    RT.createConstructorContext({ secretKey }, COIN),
    THRESHOLD
  );

  const ctx = RT.createCircuitContext(
    ADDR,
    COIN,
    ctor.currentContractState,
    { secretKey }
  );
  return { contract, ctx };
};

describe('DuskPay circuits', () => {
  let contract: Contract;
  let ctx: RT.CircuitContext<any>;

  beforeEach(() => {
    ({ contract, ctx } = createContext());
  });

  describe('checkEligibility', () => {
    it('returns true when private input >= threshold', () => {
      const result = contract.impureCircuits.checkEligibility(ctx, 6000n);
      expect(result.result).toBe(true);
    });

    it('returns false when private input < threshold', () => {
      const result = contract.impureCircuits.checkEligibility(ctx, 4000n);
      expect(result.result).toBe(false);
    });

    it('returns true when private input == threshold', () => {
      const result = contract.impureCircuits.checkEligibility(ctx, THRESHOLD);
      expect(result.result).toBe(true);
    });
  });

  describe('requestPlan', () => {
    const planId = new Uint8Array(32).fill(1);
    const merchantBytes = new Uint8Array(32).fill(2);
    const merchant = { bytes: merchantBytes };
    const totalAmount = 10000n;
    const installmentAmount = 2500n;
    const installmentCount = 4n;

    it('creates plan when eligible', () => {
      const result = contract.impureCircuits.requestPlan(
        ctx,
        planId,
        merchant,
        totalAmount,
        installmentAmount,
        installmentCount,
        6000n
      );
      expect(result.result).toEqual([]);

      const state = ledger(result.context.currentQueryContext.state);
      const plan = state.plans.lookup(planId);
      expect(plan).toBeDefined();
      expect(plan.totalAmount).toBe(totalAmount);
      expect(plan.installmentAmount).toBe(installmentAmount);
      expect(plan.installmentCount).toBe(installmentCount);
      expect(plan.paidCount).toBe(0n);
      expect(plan.eligibilityResult).toBe(true);
    });

    it('fails when not eligible', () => {
      expect(() =>
        contract.impureCircuits.requestPlan(
          ctx, planId, merchant, totalAmount, installmentAmount, installmentCount, 4000n
        )
      ).toThrow('Not eligible');
    });

    it('stores borrower as caller', () => {
      const secretKey = new Uint8Array(32);
      secretKey[31] = 7;
      const { contract: c2, ctx: ctx2 } = createContext(secretKey);

      const result = c2.impureCircuits.requestPlan(
        ctx2, planId, merchant, totalAmount, installmentAmount, installmentCount, 6000n
      );
      const state = ledger(result.context.currentQueryContext.state);
      const plan = state.plans.lookup(planId);
      expect(plan.borrower.bytes).toEqual(secretKey);
    });
  });

  describe('payInstallment', () => {
    const planId = new Uint8Array(32).fill(1);
    const merchantBytes = new Uint8Array(32).fill(2);
    const merchant = { bytes: merchantBytes };
    const totalAmount = 10000n;
    const installmentAmount = 2500n;
    const installmentCount = 4n;

    beforeEach(() => {
      const result = contract.impureCircuits.requestPlan(
        ctx, planId, merchant, totalAmount, installmentAmount, installmentCount, 6000n
      );
      ctx = result.context;
    });

    it('increments paid count', () => {
      const result = contract.impureCircuits.payInstallment(ctx, planId);
      expect(result.result).toEqual([]);

      const state = ledger(result.context.currentQueryContext.state);
      const plan = state.plans.lookup(planId);
      expect(plan.paidCount).toBe(1n);
    });

    it('fails when plan not found', () => {
      const badPlanId = new Uint8Array(32).fill(99);
      expect(() => contract.impureCircuits.payInstallment(ctx, badPlanId)).toThrow('Plan not found');
    });

    it('fails when plan already complete', () => {
      for (let i = 0; i < 4; i++) {
        const result = contract.impureCircuits.payInstallment(ctx, planId);
        ctx = result.context;
      }
      expect(() => contract.impureCircuits.payInstallment(ctx, planId)).toThrow('Plan already complete');
    });

    it('fails when non-borrower tries to pay', () => {
      const otherSecretKey = new Uint8Array(32);
      otherSecretKey[31] = 99;
      const { contract: c2, ctx: ctx2 } = createContext(otherSecretKey);

      expect(() => c2.impureCircuits.payInstallment(ctx2, planId)).toThrow('Plan not found');
    });
  });

  describe('checkStatus', () => {
    const planId = new Uint8Array(32).fill(1);
    const merchantBytes = new Uint8Array(32).fill(2);
    const merchant = { bytes: merchantBytes };
    const totalAmount = 10000n;
    const installmentAmount = 2500n;
    const installmentCount = 4n;

    beforeEach(() => {
      const result = contract.impureCircuits.requestPlan(
        ctx, planId, merchant, totalAmount, installmentAmount, installmentCount, 6000n
      );
      ctx = result.context;
    });

    it('returns paid/total and amounts', () => {
      const result = contract.impureCircuits.checkStatus(ctx, planId);
      expect(result.result).toEqual([0n, 4n, 2500n, 10000n]);
    });

    it('returns updated paid count after payments', () => {
      let result = contract.impureCircuits.payInstallment(ctx, planId);
      ctx = result.context;
      result = contract.impureCircuits.payInstallment(ctx, planId);
      ctx = result.context;

      const status = contract.impureCircuits.checkStatus(ctx, planId);
      expect(status.result).toEqual([2n, 4n, 2500n, 10000n]);
    });

    it('fails when plan not found', () => {
      const badPlanId = new Uint8Array(32).fill(99);
      expect(() => contract.impureCircuits.checkStatus(ctx, badPlanId)).toThrow('Plan not found');
    });
  });
});
