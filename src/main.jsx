import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/open-sans';
import './styles/tokens.css';
import './styles/tooltips.css';
import App from './App.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';

// Register Service Worker that fixes proto2 group encoding in ArcGIS PBF tiles.
// Must run before the map initialises so the SW is active when tiles are fetched.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register(import.meta.env.BASE_URL + 'sw.js')
    .then((reg) => console.log('[SW] registered, scope:', reg.scope))
    .catch((err) => console.warn('[SW] registration failed:', err));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
