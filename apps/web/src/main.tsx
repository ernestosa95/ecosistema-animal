import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PortalDuenoPage from './pages/PortalDuenoPage';
import './styles.css';

// Si la URL trae ?token=... (o la ruta empieza con /portal), mostramos el
// Portal del Dueño en vez del panel de gestión. El portal no usa el login del staff.
const params = new URLSearchParams(window.location.search);
const esPortal = window.location.pathname.startsWith('/portal') || params.has('token');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {esPortal ? <PortalDuenoPage /> : <App />}
  </React.StrictMode>,
);
