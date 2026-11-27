import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PrivacyPolicy } from './components/legal/PrivacyPolicy';
import { TermsOfService } from './components/legal/TermsOfService';
import { getLegalDocumentPath, parseLegalRouteFromUrl } from './utils/legalRoutes';
import { getDeveloperSettings, subscribeToDeveloperSettings } from './utils/developerStorage';
import { resolveInitialLanguageSync, sanitizeLanguageConfig } from './utils/languageDetection';
import { Language } from './types';
import './index.css';

const StandaloneLegalApp: React.FC<{ initialPage: 'privacy' | 'terms' }> = ({ initialPage }) => {
  const [page, setPage] = useState<'privacy' | 'terms'>(initialPage);
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const cfg = sanitizeLanguageConfig(getDeveloperSettings().languageConfig);
      return resolveInitialLanguageSync({ config: cfg }).language;
    } catch {
      return 'ht';
    }
  });

  useEffect(() => {
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#000000';
    const unsub = subscribeToDeveloperSettings(() => {
      window.dispatchEvent(new Event('omnichurch_dev_settings_updated'));
    });
    return () => {
      try {
        unsub();
      } catch {
        // ignore
      }
    };
  }, []);

  const switchPage = (nextPage: 'privacy' | 'terms') => {
    setPage(nextPage);
    try {
      window.history.replaceState(
        { standaloneLegal: nextPage },
        document.title,
        getLegalDocumentPath(nextPage)
      );
      window.scrollTo(0, 0);
    } catch {
      // ignore
    }
  };

  if (page === 'terms') {
    return (
      <TermsOfService
        language={language}
        onLanguageChange={setLanguage}
        onNavigatePrivacy={() => switchPage('privacy')}
      />
    );
  }

  return (
    <PrivacyPolicy
      language={language}
      onLanguageChange={setLanguage}
      onNavigateTerms={() => switchPage('terms')}
    />
  );
};

const rootElement = document.getElementById('root');
const initialLegalRoute = parseLegalRouteFromUrl();

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        {initialLegalRoute ? (
          <StandaloneLegalApp initialPage={initialLegalRoute} />
        ) : (
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        )}
      </ErrorBoundary>
    </React.StrictMode>
  );
}

