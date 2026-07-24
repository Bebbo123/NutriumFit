import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Register Service Worker with safe update handling (prevents infinite reload loops)
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('NutriumFit PWA: New version available.');
    // Only auto-update if not already reloaded in this session
    if (!sessionStorage.getItem('nutriumfit_sw_reloaded')) {
      sessionStorage.setItem('nutriumfit_sw_reloaded', 'true');
      updateSW(true);
    }
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
