import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletContextProvider } from './lib/duskpay/WalletContext';
import { NavBar } from './components/NavBar';
import RequestPlanPage from './pages/RequestPlanPage';
import MyPlansPage from './pages/MyPlansPage';
import PlanDetailPage from './pages/PlanDetailPage';

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
