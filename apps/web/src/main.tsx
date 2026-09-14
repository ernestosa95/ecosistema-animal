import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PortalDuenoPage from './pages/PortalDuenoPage';
import PortalAccesoPage from './pages/PortalAccesoPage';
import PortalCodigoPage from './pages/PortalCodigoPage';
import AdminPage from './pages/AdminPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import './styles.css';

// Ruteo mínimo sin librería, por URL:
//   /admin                → consola de administración (login propio)
//   /c/{codigo}           → portal público del dueño (una mascota, por código del carnet/QR)
//   /portal               → portal del dueño por DNI + código corto (emitido por staff, 15 min)
//   ?token={token}        → portal del dueño por magic-link (todas sus mascotas, emitido por staff)
//   ?resetToken={token}   → "olvidé mi contraseña", emitido por POST /auth/forgot-password
//   resto                 → app interna de la veterinaria
//
// ?activarToken=... ("terminá tu alta" de un interesado) se sacó de acá el
// 2026-09-14: esa activación creaba una cuenta sin pasar por la selección
// de plan — la única vía pensada para eso es /login (solicitudes/). El
// componente (`ActivarInteresadoPage.tsx`) y el endpoint del backend
// (`InteresadosService.activar()`) quedan sin usarse, no se borraron.
const path = window.location.pathname;
const qs = new URLSearchParams(window.location.search);
const esAdmin = /^\/admin(\/|$)/.test(path);
const esPortal = /\/c\/[^/]+/.test(path) || qs.has('c');
const esPortalCodigo = /^\/portal(\/|$)/.test(path);
const esAccesoPortal = qs.has('token');
const esResetPassword = qs.has('resetToken');

function Root() {
  if (esAdmin) return <AdminPage />;
  if (esResetPassword) return <ResetPasswordPage />;
  if (esAccesoPortal) return <PortalAccesoPage />;
  if (esPortalCodigo) return <PortalCodigoPage />;
  if (esPortal) return <PortalDuenoPage />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
