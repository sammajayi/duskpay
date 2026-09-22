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
      <NavBar />
      <main className="mx-auto max-w-xl px-4 py-8">
        <Routes>
          <Route path="/" element={<RequestPlanPage />} />
          <Route path="/plans" element={<MyPlansPage />} />
          <Route path="/plans/:id" element={<PlanDetailPage />} />
        </Routes>
      </main>
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
