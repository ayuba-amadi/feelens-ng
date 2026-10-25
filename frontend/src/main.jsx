import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Sentry } from './monitoring/sentry';
import App from './App';
import './index.css';

function MonitoringFallback() {
  return (
    <main className="page-shell py-16 text-center">
      <h1 className="font-heading text-2xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-3 text-slate-600">Please reload FeeLens and try again.</p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<MonitoringFallback />}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

