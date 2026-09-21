/** A plan's description is stored on-chain as a fixed 64-byte field (UTF-8, zero-padded). */
export const DESCRIPTION_BYTES = 64;

export const encodeDescription = (text: string): Uint8Array => {
  const encoded = new TextEncoder().encode(text.trim());
  if (encoded.length > DESCRIPTION_BYTES) {
    throw new Error(`Description is too long (max ${DESCRIPTION_BYTES} bytes — about ${DESCRIPTION_BYTES} plain characters)`);
  }
  const out = new Uint8Array(DESCRIPTION_BYTES);
  out.set(encoded);
  return out;
};

export const decodeDescription = (bytes: Uint8Array): string => {
  const end = bytes.indexOf(0);
  return new TextDecoder().decode(end === -1 ? bytes : bytes.subarray(0, end));
};
