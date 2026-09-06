// Carnet del animal: tarjeta de identificación tipo DNI (tamaño CR80, igual
// que una tarjeta de crédito/carnet real — 85.6 × 54 mm ≈ 243 × 154 pt),
// pensada para imprimir y llevar encima, no para archivar. El registro
// completo (vacunas/desparasitaciones/tratamientos) va en la ficha A4
// (ver ficha.document.ts) — acá sólo entran los datos mínimos de
// identificación + el QR al portal, por espacio.
// Sin JSX a propósito, igual que ficha.document.ts (ver esa nota).
import { createElement as h } from 'react';
import {
  Document, Page, View, Text, StyleSheet, Svg, Ellipse, Image,
} from '@react-pdf/renderer';
import type { CarnetData } from './carnet.types';
import { C } from './ficha.document';

// CR80 en puntos (72pt/in): 3.370in × 2.125in.
const CARD_WIDTH = 243;
const CARD_HEIGHT = 153;

const s = StyleSheet.create({
  page: { padding: 0, fontFamily: 'Helvetica', color: C.ink, fontSize: 7 },

  header: { backgroundColor: C.teal, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', maxWidth: 150 },
  wordmark: { color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 11, marginLeft: 4 },
  orgLogoBox: { width: 22, height: 22, borderRadius: 4, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', padding: 1 },
  orgLogo: { width: 18, height: 18, objectFit: 'contain' },
  orgNombre: { color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 9, marginLeft: 5 },
  kicker: { color: '#BFE4DC', fontSize: 5.5, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },

  body: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 8, gap: 8 },

  photoBox: { width: 46, height: 46, borderRadius: 6, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: 46, height: 46 },

  info: { flex: 1, justifyContent: 'center' },
  nombre: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.tealDark },
  especie: { fontSize: 7, color: C.muted, marginTop: 1 },
  idLabel: { color: C.muted, fontSize: 5.5, fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginTop: 5 },
  idCode: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.ink, letterSpacing: 0.3 },
  microchip: { fontSize: 6, color: C.muted, marginTop: 2 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, gap: 8, borderTopWidth: 1, borderTopColor: C.line },
  qr: { width: 32, height: 32 },
  duenoBox: { flex: 1 },
  duenoNombre: { fontSize: 7, fontFamily: 'Helvetica-Bold' },
  duenoTelefono: { fontSize: 6.5, color: C.muted, marginTop: 1 },
});

function PawLogo(size = 14, color = C.white) {
  return h(Svg as any, { width: size, height: size, viewBox: '0 0 100 100' }, [
    h(Ellipse as any, { key: 'pad', cx: 50, cy: 66, rx: 22, ry: 18, fill: color }),
    h(Ellipse as any, { key: 't1', cx: 24, cy: 44, rx: 8.5, ry: 11, fill: color }),
    h(Ellipse as any, { key: 't2', cx: 41, cy: 30, rx: 8.5, ry: 12, fill: color }),
    h(Ellipse as any, { key: 't3', cx: 59, cy: 30, rx: 8.5, ry: 12, fill: color }),
    h(Ellipse as any, { key: 't4', cx: 76, cy: 44, rx: 8.5, ry: 11, fill: color }),
  ]);
}

/**
 * Fila de marca del encabezado: si la organización cargó su propio logo
 * ("Mi plan" → self-service), reemplaza la marca "Huella" por el logo +
 * nombre de la organización — esto es lo que el dueño de la mascota ve, así
 * que es la marca de la veterinaria la que tiene que estar, no la de la
 * plataforma. Sin logo propio, se mantiene el branding de Huella de siempre.
 */
function Brand(data: CarnetData) {
  const org = data.organizacion;
  if (org?.logoUrl) {
    return [
      h(View, { key: 'logoBox', style: s.orgLogoBox }, h(Image, { style: s.orgLogo, src: org.logoUrl })),
      h(Text, { key: 'wm', style: s.orgNombre }, org.nombre),
    ];
  }
  return [
    PawLogo(),
    h(Text, { key: 'wm', style: s.wordmark }, 'Huella'),
  ];
}

/** Devuelve el elemento react-pdf del carnet (tarjeta). El service lo pasa a renderToBuffer. */
export function CarnetDocument(data: CarnetData) {
  const p = data.paciente;
  const d = data.dueno;

  return h(Document as any, {
    title: `Carnet — ${p.nombre}`,
    author: 'Huella',
    subject: 'Carnet de identificación del paciente',
  },
    h(Page as any, { size: [CARD_WIDTH, CARD_HEIGHT], style: s.page }, [

      h(View, { key: 'h', style: s.header }, [
        h(View, { key: 'brand', style: s.brandRow }, Brand(data)),
        h(Text, { key: 'k', style: s.kicker }, 'CARNET'),
      ]),

      h(View, { key: 'body', style: s.body }, [
        h(View, { key: 'photo', style: s.photoBox },
          p.fotoUrl
            ? h(Image, { key: 'img', style: s.photo, src: p.fotoUrl })
            : PawLogo(24, C.line)),
        h(View, { key: 'info', style: s.info }, [
          h(Text, { key: 'n', style: s.nombre }, p.nombre),
          h(Text, { key: 'e', style: s.especie }, [p.especie, p.raza].filter((x) => x && x !== '—').join(' · ') || p.especie),
          h(Text, { key: 'il', style: s.idLabel }, 'IDENTIFICACIÓN ÚNICA'),
          h(Text, { key: 'ic', style: s.idCode }, p.codigoLegible),
          h(Text, { key: 'mc', style: s.microchip }, p.microchip || 'Sin microchip'),
        ]),
      ]),

      h(View, { key: 'foot', style: s.footer, fixed: true }, [
        h(Image, { key: 'qr', style: s.qr, src: data.qrDataUrl }),
        h(View, { key: 'due', style: s.duenoBox }, [
          h(Text, { key: 'n', style: s.duenoNombre }, d.nombre !== '—' ? d.nombre : 'Sin responsable registrado'),
          h(Text, { key: 't', style: s.duenoTelefono }, d.telefono !== '—' ? d.telefono : ' '),
        ]),
      ]),
    ]),
  );
}
