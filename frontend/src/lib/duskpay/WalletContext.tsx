import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { connectWallet, deriveCallerAddressBytes, type WalletConnection } from './wallet';

type WalletState = {
  connection: WalletConnection | null;
  callerAddressBytes: Uint8Array | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
};

const WalletContext = createContext<WalletState | null>(null);

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [callerAddressBytes, setCallerAddressBytes] = useState<Uint8Array | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const conn = await connectWallet();
      const bytes = await deriveCallerAddressBytes(conn.unshieldedAddress);
      setConnection(conn);
      setCallerAddressBytes(bytes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const value = useMemo(
    () => ({ connection, callerAddressBytes, isConnecting, error, connect }),
    [connection, callerAddressBytes, isConnecting, error, connect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export const useWallet = (): WalletState => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletContextProvider');
  return ctx;
};
