import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {AuthProvider} from './AuthContext.tsx';
import {GenerationProvider} from './GenerationContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <GenerationProvider>
        <App />
      </GenerationProvider>
    </AuthProvider>
  </StrictMode>,
);
