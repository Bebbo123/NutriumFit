import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Register Service Worker for PWA offline capabilities
registerSW({
  onNeedRefresh() {
    console.log('NutriumFit PWA: New content available, reload page to update.');
  },
  onOfflineReady() {
    console.log('NutriumFit PWA: App ready to work offline!');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
