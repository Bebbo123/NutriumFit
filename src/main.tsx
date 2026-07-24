import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Register Service Worker for PWA offline capabilities & Web Push
registerSW({
  onNeedRefresh() {
    console.log('NutriumFit PWA: New content available, reload page to update.');
  },
  onOfflineReady() {
    console.log('NutriumFit PWA: App ready to work offline!');
  },
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/custom-sw.js').catch((err) => {
      console.log('Custom Push SW registration:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
