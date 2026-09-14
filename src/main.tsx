import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { useGame } from '@state/store';
import './index.css';

// Carica il profilo salvato prima del primo render.
useGame.getState().init();

// Service worker per il funzionamento offline (PWA).
registerSW({ immediate: true });

const root = document.getElementById('root');
if (!root) throw new Error('#root non trovato');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
