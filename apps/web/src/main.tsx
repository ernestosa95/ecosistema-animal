import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PortalDuenoPage from './pages/PortalDuenoPage';
import './styles.css';

// Ruteo mínimo sin librería: si la URL es /c/{codigo} (o ?c=...), es el
// portal público del dueño; si no, la app interna de la veterinaria.
const esPortal =
  /\/c\/[^/]+/.test(window.location.pathname) ||
  new URLSearchParams(window.location.search).has('c');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {esPortal ? <PortalDuenoPage /> : <App />}
  </React.StrictMode>,
);
