import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ApiKeyProvider } from './ApiKeyContext.tsx';
import { GenerationProvider } from './GenerationContext';
import { TokenQueryProvider } from './context/TokenQueryContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ApiKeyProvider>
          <TokenQueryProvider>
            <GenerationProvider>
              <App />
            </GenerationProvider>
          </TokenQueryProvider>
        </ApiKeyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
