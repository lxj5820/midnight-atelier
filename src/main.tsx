import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ApiKeyProvider } from './ApiKeyContext.tsx';
import { GenerationProvider } from './GenerationContext';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ApiKeyProvider>
        <GenerationProvider>
          <App />
        </GenerationProvider>
      </ApiKeyProvider>
    </ErrorBoundary>
  </StrictMode>,
);
