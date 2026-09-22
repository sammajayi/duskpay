import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../lib/duskpay/WalletContext';

const links = [
  { href: '/app', label: 'Request Plan' },
  { href: '/app/plans', label: 'My Plans' },
];

export function NavBar() {
  const { pathname } = useLocation();
  const { connection, isConnecting, error, connect } = useWallet();

  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-lg font-bold tracking-tight text-white">
          DuskPay
        </Link>
        <nav className="flex gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              className={
                pathname === l.href
                  ? 'font-semibold text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div>
          {connection ? (
            <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
              {connection.unshieldedAddress.slice(0, 10)}…{connection.unshieldedAddress.slice(-6)}
            </span>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-black disabled:opacity-50"
            >
              {isConnecting ? 'Connecting…' : 'Connect Lace'}
            </button>
          )}
        </div>
      </div>
      {error && <p className="mx-auto max-w-xl px-4 pb-2 text-xs text-red-400">{error}</p>}
    </header>
  );
}
