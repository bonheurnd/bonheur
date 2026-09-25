import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Automatically register and update the PWA service worker in production
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('New content available, auto-updating...');
    },
    onOfflineReady() {
      console.log('La Lumiere app is ready for offline use!');
    },
  });
} else if ('serviceWorker' in navigator) {
  // In development, ensure stale service workers don't intercept dev server requests
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {
    // ignore
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

