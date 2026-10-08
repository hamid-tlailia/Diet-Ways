import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './lib/install'; // start listening for the install prompt before the app renders
import { captureLaunchParams } from './lib/activity';
import './styles.css';

// Self-heal: if styles are missing (seen on some phones), report what the browser sees to the
// server logs, clear the offline cache and reload once instead of leaving an unstyled app.
window.addEventListener('load', () => {
  const styled = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (styled) return;
  const sheets = [...document.styleSheets].map((sh) => {
    let rules = -1;
    try {
      rules = sh.cssRules.length;
    } catch {
      /* cross-origin */
    }
    return `${sh.href ?? 'inline'}:${rules}`;
  });
  const diag = {
    step: 'styles',
    error: `unstyled; sheets=${sheets.join(',')}; styleTags=${document.querySelectorAll('style').length}; sw=${!!navigator.serviceWorker?.controller}; healed=${!!sessionStorage.getItem('dw-heal')}`,
    ua: navigator.userAgent.slice(0, 200),
  };
  navigator.sendBeacon?.('/api/push?diag', new Blob([JSON.stringify({ diag })], { type: 'application/json' }));
  if (sessionStorage.getItem('dw-heal')) return;
  sessionStorage.setItem('dw-heal', '1');
  const clear = 'caches' in window ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))) : Promise.resolve();
  const unregister = navigator.serviceWorker?.getRegistrations?.().then((rs) => Promise.all(rs.map((r) => r.unregister()))) ?? Promise.resolve();
  Promise.allSettled([clear, unregister]).finally(() => window.location.reload());
});

captureLaunchParams();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
