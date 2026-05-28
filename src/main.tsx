import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ApiKeyProvider } from './ApiKeyContext.tsx';
import { GenerationProvider } from './GenerationContext';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const suppressTranslationErrors = (e: ErrorEvent) => {
  if (
    e.message.includes('removeChild') ||
    e.message.includes('insertBefore') ||
    e.message.includes('not a child of this node')
  ) {
    e.preventDefault();
    return;
  }
};

window.addEventListener('error', suppressTranslationErrors);

const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('removeChild') ||
      args[0].includes('insertBefore') ||
      args[0].includes('not a child of this node'))
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')!, {
  onRecoverableError: (error) => {
    if (
      error instanceof Error &&
      (error.message.includes('removeChild') ||
        error.message.includes('insertBefore') ||
        error.message.includes('not a child of this node'))
    ) {
      return;
    }
    console.error('React recoverable error:', error);
  },
}).render(
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
