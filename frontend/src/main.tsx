import { Suspense, lazy, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import './index.css';
import { Dashboard } from './pages/Dashboard';
import { SearchScores } from './pages/SearchScores';
import { SettingsPage } from './pages/Settings';
import { SettingsProvider } from './settings';

const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="search" element={<SearchScores />} />
            <Route
              path="reports"
              element={
                <Suspense fallback={<div className="surface h-96 animate-pulse" />}>
                  <Reports />
                </Suspense>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  </StrictMode>,
);
