import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Self-heal: if the stylesheet failed to load (flaky network right after an update), clear the
// offline cache and reload once instead of leaving an unstyled app on screen.
window.addEventListener('load', () => {
  const styled = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (styled || sessionStorage.getItem('dw-heal')) return;
  sessionStorage.setItem('dw-heal', '1');
  const clear = 'caches' in window ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))) : Promise.resolve();
  clear.finally(() => window.location.reload());
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
