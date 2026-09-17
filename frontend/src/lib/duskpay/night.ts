// 1 NIGHT = 10^6 STAR (NIGHT's smallest on-chain unit), per
// docs.midnight.network/tokens/overview. All amounts the contract stores
// (Plan.totalAmount, Plan.installmentAmount) are raw STAR integers — there's
// no decimal handling on-chain, so the UI has to do the conversion.
export const NIGHT_DECIMALS = 6;
const NIGHT_TO_STAR = 10n ** BigInt(NIGHT_DECIMALS);

/** Parses a user-entered NIGHT amount (e.g. "12.5") into whole STAR. */
export const nightToStar = (night: string): bigint => {
  const trimmed = night.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Enter a valid amount, e.g. 12.5');
  }
  const [whole, fraction = ''] = trimmed.split('.');
  const paddedFraction = fraction.padEnd(NIGHT_DECIMALS, '0').slice(0, NIGHT_DECIMALS);
  if (fraction.length > NIGHT_DECIMALS) {
    throw new Error(`NIGHT only has ${NIGHT_DECIMALS} decimal places of precision`);
  }
  return BigInt(whole || '0') * NIGHT_TO_STAR + BigInt(paddedFraction || '0');
};

/** Formats a raw STAR amount back into a human-readable NIGHT string. */
export const starToNight = (star: bigint): string => {
  const whole = star / NIGHT_TO_STAR;
  const fraction = star % NIGHT_TO_STAR;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(NIGHT_DECIMALS, '0').replace(/0+$/, '')}`;
};
