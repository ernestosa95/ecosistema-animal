import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import PortalDuenoPage from './pages/PortalDuenoPage';
import AdminPage from './pages/AdminPage';
import './styles.css';

// Ruteo simple por URL (sin router):
//  - /admin         → panel de administración de plataforma (super-admin)
//  - /portal ?token → portal del dueño
//  - resto          → panel de gestión de la veterinaria
const path = window.location.pathname;
const params = new URLSearchParams(window.location.search);

const esAdmin = path.startsWith('/admin');
const esPortal = path.startsWith('/portal') || params.has('token');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {esAdmin ? <AdminPage /> : esPortal ? <PortalDuenoPage /> : <App />}
  </React.StrictMode>,
);
