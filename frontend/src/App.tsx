import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletContextProvider } from './lib/duskpay/WalletContext';
import { NavBar } from './components/NavBar';
import LandingPage from './pages/LandingPage';
import RequestPlanPage from './pages/RequestPlanPage';
import MyPlansPage from './pages/MyPlansPage';
import PlanDetailPage from './pages/PlanDetailPage';

function AppShell() {
  return (
    <WalletContextProvider>
      <div className="min-h-screen w-full bg-[#0a0a0f] font-mono-sans text-[#f2f0ea]">
        <NavBar />
        <main className="mx-auto max-w-2xl px-6 py-12 md:px-10">
          <Routes>
            <Route path="/" element={<RequestPlanPage />} />
            <Route path="/plans" element={<MyPlansPage />} />
            <Route path="/plans/:id" element={<PlanDetailPage />} />
          </Routes>
        </main>
      </div>
    </WalletContextProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  );
}
