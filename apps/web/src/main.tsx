import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PortalDuenoPage from './pages/PortalDuenoPage';
import PortalAccesoPage from './pages/PortalAccesoPage';
import AdminPage from './pages/AdminPage';
import './styles.css';

// Ruteo mínimo sin librería, por URL:
//   /admin         → consola de administración (login propio)
//   /c/{codigo}    → portal público del dueño (una mascota, por código del carnet/QR)
//   ?token={token} → portal del dueño por magic-link (todas sus mascotas, emitido por staff)
//   resto          → app interna de la veterinaria
const path = window.location.pathname;
const qs = new URLSearchParams(window.location.search);
const esAdmin = /^\/admin(\/|$)/.test(path);
const esPortal = /\/c\/[^/]+/.test(path) || qs.has('c');
const esAccesoPortal = qs.has('token');

function Root() {
  if (esAdmin) return <AdminPage />;
  if (esAccesoPortal) return <PortalAccesoPage />;
  if (esPortal) return <PortalDuenoPage />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
