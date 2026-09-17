import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  callerAddress(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  checkEligibility(context: __compactRuntime.CircuitContext<PS>,
                   privateInput_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  requestPlan(context: __compactRuntime.CircuitContext<PS>,
              planId_0: Uint8Array,
              merchant_0: { bytes: Uint8Array },
              totalAmount_0: bigint,
              installmentAmount_0: bigint,
              installmentCount_0: bigint,
              privateInput_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  payInstallment(context: __compactRuntime.CircuitContext<PS>,
                 planId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  checkStatus(context: __compactRuntime.CircuitContext<PS>, planId_0: Uint8Array): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                                        bigint,
                                                                                                                        bigint,
                                                                                                                        bigint]>;
}

export type ProvableCircuits<PS> = {
  checkEligibility(context: __compactRuntime.CircuitContext<PS>,
                   privateInput_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  requestPlan(context: __compactRuntime.CircuitContext<PS>,
              planId_0: Uint8Array,
              merchant_0: { bytes: Uint8Array },
              totalAmount_0: bigint,
              installmentAmount_0: bigint,
              installmentCount_0: bigint,
              privateInput_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  payInstallment(context: __compactRuntime.CircuitContext<PS>,
                 planId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  checkStatus(context: __compactRuntime.CircuitContext<PS>, planId_0: Uint8Array): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                                        bigint,
                                                                                                                        bigint,
                                                                                                                        bigint]>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  checkEligibility(context: __compactRuntime.CircuitContext<PS>,
                   privateInput_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  requestPlan(context: __compactRuntime.CircuitContext<PS>,
              planId_0: Uint8Array,
              merchant_0: { bytes: Uint8Array },
              totalAmount_0: bigint,
              installmentAmount_0: bigint,
              installmentCount_0: bigint,
              privateInput_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  payInstallment(context: __compactRuntime.CircuitContext<PS>,
                 planId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  checkStatus(context: __compactRuntime.CircuitContext<PS>, planId_0: Uint8Array): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                                        bigint,
                                                                                                                        bigint,
                                                                                                                        bigint]>;
}

export type Ledger = {
  plans: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): { borrower: { bytes: Uint8Array },
                                 merchant: { bytes: Uint8Array },
                                 totalAmount: bigint,
                                 installmentAmount: bigint,
                                 installmentCount: bigint,
                                 paidCount: bigint,
                                 eligibilityResult: boolean
                               };
    [Symbol.iterator](): Iterator<[Uint8Array, { borrower: { bytes: Uint8Array },
  merchant: { bytes: Uint8Array },
  totalAmount: bigint,
  installmentAmount: bigint,
  installmentCount: bigint,
  paidCount: bigint,
  eligibilityResult: boolean
}]>
  };
  readonly eligibilityThreshold: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               threshold_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
