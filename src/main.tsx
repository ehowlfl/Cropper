import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ColorDataProvider } from './contexts/ColorDataContext';
import { PinControlRulesProvider } from './contexts/PinControlRulesContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorDataProvider>
      <PinControlRulesProvider>
        <App />
      </PinControlRulesProvider>
    </ColorDataProvider>
  </StrictMode>
);
