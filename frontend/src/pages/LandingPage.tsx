import { Link } from 'react-router-dom';

const CONTRACT_ADDRESS =
  'a41e881d9d1278926b988d1a2a52f8db9ac7f7f66a6835e4ce441ef83e9d3bc1';
const EXPLORER_URL = `https://explorer.preview.midnight.network/contracts/${CONTRACT_ADDRESS}`;
const DEMO_URL = 'https://www.loom.com/share/411ff3a3029a4e1aaaefab0f032e5896';
const GITHUB_URL = 'https://github.com/sammajayi/duskpay';
const X_URL = 'https://x.com/duskpayy';
const DOCS_URL = 'https://docs.midnight.network/';

function Logo() {
  return (
    <div className="h-[26px] w-[26px] flex-shrink-0 rounded-[7px] bg-gradient-to-br from-[#7c8cff] to-[#2c2f66]" />
  );
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      to={href}
      className="inline-flex items-center gap-2 rounded-lg border border-[#f2f0ea] bg-[#f2f0ea] px-[26px] py-[14px] font-mono-sans text-[15px] font-semibold text-[#0a0a0f] transition-opacity hover:opacity-85"
    >
      {children}
    </Link>
  );
}

function GhostButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border border-[#26262f] px-[26px] py-[14px] font-mono-sans text-[15px] font-semibold text-[#f2f0ea] transition-colors hover:border-[#4b4fa8] hover:bg-[#7c8cff]/[0.14]"
    >
      {children}
    </a>
  );
}

const steps = [
  {
    n: '01',
    title: 'Connect and describe the purchase',
    body: 'Buyer connects Lace, enters the purchase description, amount, merchant address, installment count, and a private eligibility input that never leaves their machine.',
  },
  {
    n: '02',
    title: 'Prove eligibility, locally',
    body: (
      <>
        <code className="text-[#f2f0ea]">checkEligibility</code> runs inside a ZK circuit
        against a sealed on-chain threshold. Only the pass/fail result ever leaves the proof,
        set by the contract's owner at deploy time.
      </>
    ),
  },
  {
    n: '03',
    title: 'Plan goes on-chain',
    body: (
      <>
        If eligible, <code className="text-[#f2f0ea]">requestPlan</code> records borrower,
        merchant, amounts, installment count, and description as a public installment plan.
      </>
    ),
  },
  {
    n: '04',
    title: 'Pay installments, one at a time',
    body: (
      <>
        Only the borrower can call <code className="text-[#f2f0ea]">payInstallment</code>.
        NIGHT moves from borrower to merchant in a single transaction, no pool, no auto-debit.
      </>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="w-full min-w-[360px] bg-[#0a0a0f] font-mono-sans text-[#f2f0ea]">
      {/* NAV */}
      <div className="sticky top-0 z-20 border-b border-[#1b1b24] bg-[#0a0a0f]/[0.82] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5 md:px-10">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-serif-display text-xl font-semibold">DuskPay</span>
          </Link>
          <div className="hidden items-center gap-9 md:flex">
            <a href="#how" className="text-sm text-[#a8a6b3]">
              How it works
            </a>
            <a href="#privacy" className="text-sm text-[#a8a6b3]">
              Privacy
            </a>
            <a href="#contract" className="text-sm text-[#a8a6b3]">
              Contract
            </a>
            <a href={GITHUB_URL} className="text-sm text-[#a8a6b3]">
              GitHub
            </a>
          </div>
          <Link
            to="/app"
            className="rounded-lg border border-[#f2f0ea] bg-[#f2f0ea] px-5 py-2.5 font-mono-sans text-sm font-semibold text-[#0a0a0f] transition-opacity hover:opacity-85"
          >
            Launch App
          </Link>
        </div>
      </div>

      {/* HERO */}
      <div className="relative flex w-full justify-center overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-[-200px] h-[600px] w-[900px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(124,140,255,0.14),transparent)]" />
        <div className="relative flex w-full max-w-[1200px] flex-col items-center px-6 py-24 text-center md:px-10 md:py-32">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#26262f] px-3.5 py-1.5 text-[13px] text-[#a8a6b3]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7c8cff] shadow-[0_0_0_3px_rgba(124,140,255,0.14)]" />
            Live on Midnight Preview testnet
          </div>
          <h1 className="font-serif-display max-w-3xl text-[42px] font-medium leading-[1.08] md:text-[68px]">
            Buy now, pay later, <span className="italic text-[#7c8cff]">without</span> handing
            over your finances.
          </h1>
          <p className="mt-7 max-w-[620px] text-[17px] leading-[1.6] text-[#a8a6b3] md:text-[19px]">
            DuskPay proves you clear an eligibility bar with a zero-knowledge proof. The
            merchant, the chain, and everyone watching only ever see pass or fail, never the
            number behind it.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <PrimaryButton href="/app">Launch the app</PrimaryButton>
            <GhostButton href={DEMO_URL}>Watch 3-min demo</GhostButton>
          </div>
          <p className="mt-5 text-[13px] text-[#6f6d7a]">
            Needs Lace wallet connected to Preview &middot; zero-knowledge proving runs locally on
            your machine, not on Midnight's servers
          </p>
        </div>
      </div>

      {/* FACT STRIP */}
      <div className="flex w-full justify-center border-y border-[#1b1b24]">
        <div className="grid w-full max-w-[1200px] grid-cols-2 gap-6 px-6 py-7 md:grid-cols-4 md:px-10">
          <div className="flex flex-col gap-1">
            <span className="font-serif-display text-[26px]">0</span>
            <span className="text-[13px] text-[#6f6d7a]">values ever revealed on-chain</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-serif-display text-[26px]">1</span>
            <span className="text-[13px] text-[#6f6d7a]">
              boolean disclosed per eligibility check
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-serif-display text-[26px]">13</span>
            <span className="text-[13px] text-[#6f6d7a]">
              simulator tests covering the circuit
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-serif-display text-[26px]">0</span>
            <span className="text-[13px] text-[#6f6d7a]">
              liquidity pools or automation, you pay manually
            </span>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how" className="flex w-full justify-center">
        <div className="flex w-full max-w-[1200px] flex-col px-6 py-24 md:px-10 md:py-32">
          <span className="font-mono-sans text-xs font-semibold uppercase tracking-[0.14em] text-[#7c8cff]">
            How it works
          </span>
          <h2 className="font-serif-display mt-3.5 max-w-xl text-[32px] font-medium md:text-[42px]">
            Five steps, one private input.
          </h2>
          <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#1b1b24] bg-[#1b1b24] md:grid-cols-2">
            {steps.map((s) => (
              <div key={s.n} className="flex flex-col gap-3.5 bg-[#15151f] p-8 md:p-10">
                <span className="font-serif-display text-[34px] text-[#7c8cff]">{s.n}</span>
                <h3 className="text-xl font-medium">{s.title}</h3>
                <p className="text-[15px] leading-[1.6] text-[#a8a6b3]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRIVACY */}
      <div id="privacy" className="flex w-full justify-center border-y border-[#1b1b24] bg-[#111119]">
        <div className="grid w-full max-w-[1200px] grid-cols-1 items-center gap-16 px-6 py-24 md:grid-cols-2 md:gap-20 md:px-10 md:py-32">
          <div className="flex flex-col">
            <span className="font-mono-sans text-xs font-semibold uppercase tracking-[0.14em] text-[#7c8cff]">
              The privacy model
            </span>
            <h2 className="font-serif-display mt-3.5 text-[32px] font-medium md:text-[40px]">
              Public ledger. Private life.
            </h2>
            <p className="mt-5 text-base leading-[1.7] text-[#a8a6b3]">
              Everything about a DuskPay plan is public on-chain: borrower, merchant, amounts,
              schedule, the eligibility verdict. Everything except the number that produced that
              verdict.
            </p>
            <p className="mt-4 text-base leading-[1.7] text-[#a8a6b3]">
              No lender sees your income. No merchant sees your credit history. No indexer can
              reconstruct it later. The zero-knowledge proof carries the answer; the question
              stays on your machine.
            </p>
            <div className="mt-8 flex gap-3.5">
              <a
                href={DOCS_URL}
                className="rounded-lg border border-[#26262f] px-5 py-[11px] text-sm font-semibold transition-colors hover:border-[#4b4fa8] hover:bg-[#7c8cff]/[0.14]"
              >
                Midnight docs &#8599;
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-[#26262f] bg-[#15151f] p-8 text-[13.5px] leading-[1.7]">
            <div className="mb-5 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#3f3f4a]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#3f3f4a]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#3f3f4a]" />
              <span className="ml-2 text-[#6f6d7a]">checkEligibility.compact</span>
            </div>
            <div className="text-[#6f6d7a]">circuit checkEligibility(</div>
            <div className="pl-5 text-[#a8a6b3]">
              private input: <span className="text-[#7c8cff]">Field</span>,
            </div>
            <div className="pl-5 text-[#a8a6b3]">
              threshold: <span className="text-[#7c8cff]">Field</span>
            </div>
            <div className="text-[#6f6d7a]">
              ): <span className="text-[#7c8cff]">Boolean</span> {'{'}
            </div>
            <div className="pl-5 text-[#a8a6b3]">return input &gt;= threshold;</div>
            <div className="text-[#6f6d7a]">{'}'}</div>
            <div className="mt-4.5 border-t border-[#26262f] pt-4.5 text-[#6f6d7a]">
              // on-chain result
            </div>
            <div className="text-[#f2f0ea]">
              eligible: <span className="text-[#7ee787]">true</span>
            </div>
            <div className="text-[#6f6d7a]">
              input: <span className="text-[#ff7b72]">never disclosed</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTRACT */}
      <div id="contract" className="flex w-full justify-center">
        <div className="flex w-full max-w-[1200px] flex-col items-center px-6 py-24 text-center md:px-10 md:py-32">
          <span className="font-mono-sans text-xs font-semibold uppercase tracking-[0.14em] text-[#7c8cff]">
            Built in the open
          </span>
          <h2 className="font-serif-display mt-3.5 max-w-xl text-[32px] font-medium md:text-[40px]">
            A real contract, deployed and verifiable, not a demo you have to trust.
          </h2>
          <div className="mt-11 flex w-full max-w-[760px] flex-col items-start gap-5 rounded-xl border border-[#26262f] bg-[#15151f] p-6 text-left sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 overflow-hidden">
              <div className="mb-1.5 text-xs text-[#6f6d7a]">Midnight Preview testnet</div>
              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[#a8a6b3]">
                {CONTRACT_ADDRESS}
              </div>
            </div>
            <a
              href={EXPLORER_URL}
              className="flex-shrink-0 rounded-lg border border-[#26262f] px-4.5 py-2.5 text-[13px] font-semibold transition-colors hover:border-[#4b4fa8] hover:bg-[#7c8cff]/[0.14]"
            >
              View on explorer &#8599;
            </a>
          </div>
          <div className="mt-9 flex gap-4">
            <a
              href={GITHUB_URL}
              className="rounded-lg border border-[#26262f] px-5 py-3.5 text-sm font-semibold transition-colors hover:border-[#4b4fa8] hover:bg-[#7c8cff]/[0.14]"
            >
              Read the source &#8599;
            </a>
            <a
              href={X_URL}
              className="rounded-lg border border-[#26262f] px-5 py-3.5 text-sm font-semibold transition-colors hover:border-[#4b4fa8] hover:bg-[#7c8cff]/[0.14]"
            >
              Follow on X &#8599;
            </a>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="flex w-full justify-center border-t border-[#1b1b24] bg-[#111119]">
        <div className="flex w-full max-w-[1200px] flex-col items-center px-6 py-24 text-center md:px-10 md:py-28">
          <h2 className="font-serif-display max-w-xl text-[30px] font-medium md:text-[46px]">
            Prove you qualify. Reveal nothing else.
          </h2>
          <p className="mt-4.5 max-w-[480px] text-base leading-[1.6] text-[#a8a6b3]">
            Connect Lace, request a plan, and pay it down on your own schedule, with your
            eligibility input sealed to your own machine, always.
          </p>
          <Link
            to="/app"
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-[#f2f0ea] bg-[#f2f0ea] px-8 py-4 text-base font-semibold text-[#0a0a0f] transition-opacity hover:opacity-85"
          >
            Launch DuskPay
          </Link>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex w-full justify-center border-t border-[#1b1b24]">
        <div className="flex w-full max-w-[1200px] flex-col items-center gap-4 px-6 py-11 sm:flex-row sm:justify-between md:px-10">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-5 rounded-[6px] bg-gradient-to-br from-[#7c8cff] to-[#2c2f66]" />
            <span className="text-sm text-[#6f6d7a]">
              DuskPay: private BNPL on Midnight Network
            </span>
          </div>
          <div className="flex gap-7">
            <a href={GITHUB_URL} className="text-[13px] text-[#6f6d7a]">
              GitHub
            </a>
            <a href={X_URL} className="text-[13px] text-[#6f6d7a]">
              X
            </a>
            <a href={DEMO_URL} className="text-[13px] text-[#6f6d7a]">
              Demo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
