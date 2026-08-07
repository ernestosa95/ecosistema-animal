import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PortalDuenoPage from './pages/PortalDuenoPage';
import AdminPage from './pages/AdminPage';
import './styles.css';

// Ruteo mínimo sin librería, por URL:
//   /admin        → consola de administración (login propio)
//   /c/{codigo}   → portal público del dueño
//   resto         → app interna de la veterinaria
const path = window.location.pathname;
const esAdmin = /^\/admin(\/|$)/.test(path);
const esPortal =
  /\/c\/[^/]+/.test(path) ||
  new URLSearchParams(window.location.search).has('c');

function Root() {
  if (esAdmin) return <AdminPage />;
  if (esPortal) return <PortalDuenoPage />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
