import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './AuthContext.tsx';
import { ApiKeyProvider } from './ApiKeyContext.tsx';
import { GenerationProvider } from './GenerationContext';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ApiKeyProvider>
        <AuthProvider>
          <GenerationProvider>
            <App />
          </GenerationProvider>
        </AuthProvider>
      </ApiKeyProvider>
    </ErrorBoundary>
  </StrictMode>,
);
