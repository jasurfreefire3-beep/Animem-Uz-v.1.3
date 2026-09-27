import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

// Global API Base URL routing for split frontend (Vercel) & backend (Northflank)
const rawApiBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
if (rawApiBase && typeof window !== 'undefined') {
  const API_BASE = rawApiBase.replace(/\/$/, '');

  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string') {
      if (input.startsWith('/api') || input.startsWith('/stream')) {
        input = `${API_BASE}${input}`;
      }
    } else if (input instanceof URL) {
      if (input.pathname.startsWith('/api') || input.pathname.startsWith('/stream')) {
        input = new URL(`${API_BASE}${input.pathname}${input.search}`);
      }
    } else if (typeof Request !== 'undefined' && input instanceof Request) {
      const url = new URL(input.url);
      if (url.pathname.startsWith('/api') || url.pathname.startsWith('/stream')) {
        if (url.origin === window.location.origin) {
          input = new Request(`${API_BASE}${url.pathname}${url.search}`, input);
        }
      }
    }
    return originalFetch.call(this, input, init);
  };

  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
    let targetUrl = url;
    if (typeof url === 'string' && (url.startsWith('/api') || url.startsWith('/stream'))) {
      targetUrl = `${API_BASE}${url}`;
    }
    return (originalXhrOpen as any).apply(this, [method, targetUrl, ...rest]);
  };
}

// TV & Safe Storage theme check
try {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
} catch (e) {
  console.warn("Storage not accessible for theme check:", e);
}

// PWA Service Worker registration
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration notice:', err);
    });
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <LanguageProvider>
              <App />
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  );
}

