import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../lib/duskpay/WalletContext';
import logoMark from '../assets/logo-mark.png';

const links = [
  { href: '/app', label: 'Request Plan' },
  { href: '/app/plans', label: 'My Plans' },
];

export function NavBar() {
  const { pathname } = useLocation();
  const { connection, isConnecting, error, connect } = useWallet();

  return (
    <header className="sticky top-0 z-20 border-b border-[#1b1b24] bg-[#0a0a0f]/[0.82] backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-6 py-4 md:px-10">
        <Link to="/" className="flex flex-shrink-0 items-center gap-2.5">
          <img src={logoMark} alt="" className="h-[22px] w-auto" />
          <span className="font-serif-display text-lg font-semibold">DuskPay</span>
        </Link>

        <nav className="flex items-center gap-1 rounded-full border border-[#1b1b24] bg-[#111119] p-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              className={
                pathname === l.href
                  ? 'rounded-full bg-[#f2f0ea] px-3.5 py-1.5 font-semibold text-[#0a0a0f]'
                  : 'rounded-full px-3.5 py-1.5 text-[#a8a6b3] transition-colors hover:text-[#f2f0ea]'
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex-shrink-0">
          {connection ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#26262f] bg-[#15151f] px-3 py-1.5 text-xs text-[#a8a6b3]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7ee787] shadow-[0_0_0_3px_rgba(126,231,135,0.14)]" />
              {connection.unshieldedAddress.slice(0, 8)}…{connection.unshieldedAddress.slice(-4)}
            </span>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="rounded-lg border border-[#f2f0ea] bg-[#f2f0ea] px-4 py-1.5 text-xs font-semibold text-[#0a0a0f] transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {isConnecting ? 'Connecting…' : 'Connect Lace'}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="mx-auto max-w-2xl px-6 pb-2 text-xs text-[#ff7b72] md:px-10">{error}</p>
      )}
    </header>
  );
}
