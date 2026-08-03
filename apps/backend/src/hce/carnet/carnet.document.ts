// Documento del carnet Huella construido con @react-pdf/renderer.
// Sin JSX a propósito: usa createElement, así compila con el tsconfig de NestJS
// tal cual está (no hace falta activar "jsx"). Si preferís JSX, activá
// "jsx": "react" en tsconfig y renombrá este archivo a .tsx.
import { createElement as h } from 'react';
import {
  Document, Page, View, Text, StyleSheet, Svg, Ellipse,
} from '@react-pdf/renderer';
import type { CarnetData } from './carnet.types';

// ─── Paleta de marca Huella ──────────────────────────────────────────────
export const C = {
  teal: '#0E7C6B',
  tealDark: '#0A5C50',
  ink: '#17302C',
  muted: '#6B807B',
  line: '#DCE6E3',
  bg: '#F3F8F6',
  white: '#FFFFFF',
  accent: '#E9A23B',
};

const s = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 28, paddingHorizontal: 0, fontFamily: 'Helvetica', color: C.ink, fontSize: 9 },

  header: { backgroundColor: C.teal, paddingHorizontal: 22, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  wordmark: { color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 22, marginLeft: 8, letterSpacing: 0.5 },
  headerRight: { alignItems: 'flex-end' },
  headerKicker: { color: '#BFE4DC', fontSize: 7.5, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5 },
  headerSub: { color: C.white, fontSize: 8, marginTop: 2 },

  body: { paddingHorizontal: 22, paddingTop: 16 },

  idBox: { borderWidth: 1, borderColor: C.line, borderRadius: 8, backgroundColor: C.bg, padding: 12, marginBottom: 14 },
  idLabel: { color: C.muted, fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.2, marginBottom: 3 },
  idCode: { color: C.tealDark, fontSize: 19, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  idRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  idChipLabel: { color: C.muted, fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 1.2 },
  idChip: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginTop: 2 },

  sectionTitle: { color: C.teal, fontSize: 8.5, fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  cols: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  col: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 11 },
  field: { flexDirection: 'row', marginBottom: 4 },
  fieldLabel: { color: C.muted, width: 58, fontSize: 8 },
  fieldValue: { flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },

  table: { borderWidth: 1, borderColor: C.line, borderRadius: 8, overflow: 'hidden', marginBottom: 14 },
  thead: { flexDirection: 'row', backgroundColor: C.teal },
  th: { color: C.white, fontSize: 7.5, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5, paddingVertical: 6, paddingHorizontal: 8 },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line },
  trAlt: { backgroundColor: C.bg },
  td: { fontSize: 8.5, paddingVertical: 6, paddingHorizontal: 8 },
  cVac: { flex: 2.2 },
  cFecha: { flex: 1.3 },
  cProx: { flex: 1.3 },
  proxPill: { color: C.accent, fontFamily: 'Helvetica-Bold' },

  emptyRow: { padding: 10, alignItems: 'center' },
  emptyText: { color: C.muted, fontSize: 8, fontStyle: 'italic' },

  footer: { position: 'absolute', bottom: 14, left: 22, right: 22, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  qrBox: { width: 52, height: 52, borderWidth: 1, borderColor: C.line, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  qrText: { color: C.muted, fontSize: 5.5, textAlign: 'center', paddingHorizontal: 2 },
  footNote: { color: C.muted, fontSize: 7, textAlign: 'right', maxWidth: 300 },
  footStrong: { color: C.ink, fontFamily: 'Helvetica-Bold' },
});

// Logo: huella de pata en SVG vectorial (sin fuentes ni imágenes externas).
function PawLogo(size = 26, color = C.white) {
  return h(Svg as any, { width: size, height: size, viewBox: '0 0 100 100' }, [
    h(Ellipse as any, { key: 'pad', cx: 50, cy: 66, rx: 22, ry: 18, fill: color }),
    h(Ellipse as any, { key: 't1', cx: 24, cy: 44, rx: 8.5, ry: 11, fill: color }),
    h(Ellipse as any, { key: 't2', cx: 41, cy: 30, rx: 8.5, ry: 12, fill: color }),
    h(Ellipse as any, { key: 't3', cx: 59, cy: 30, rx: 8.5, ry: 12, fill: color }),
    h(Ellipse as any, { key: 't4', cx: 76, cy: 44, rx: 8.5, ry: 11, fill: color }),
  ]);
}

function Field(key: string, label: string, value?: string) {
  return h(View, { key, style: s.field }, [
    h(Text, { key: 'l', style: s.fieldLabel }, label),
    h(Text, { key: 'v', style: s.fieldValue }, value || '—'),
  ]);
}

// Devuelve el elemento react-pdf del carnet. El service lo pasa a renderToBuffer.
export function CarnetDocument(data: CarnetData) {
  const p = data.paciente;
  const d = data.dueno;
  const vacunas = data.vacunaciones || [];

  return h(Document as any, {
    title: `Carnet Huella — ${p.nombre}`,
    author: 'Huella',
    subject: 'Libreta sanitaria del paciente',
  },
    h(Page as any, { size: 'A5', style: s.page }, [

      h(View, { key: 'h', style: s.header }, [
        h(View, { key: 'brand', style: s.brandRow }, [
          PawLogo(),
          h(Text, { key: 'wm', style: s.wordmark }, 'Huella'),
        ]),
        h(View, { key: 'hr', style: s.headerRight }, [
          h(Text, { key: 'k', style: s.headerKicker }, 'LIBRETA SANITARIA'),
          h(Text, { key: 'e', style: s.headerSub }, `Emitido ${data.emitidoEl}`),
        ]),
      ]),

      h(View, { key: 'body', style: s.body }, [

        h(View, { key: 'id', style: s.idBox }, [
          h(Text, { key: 'idl', style: s.idLabel }, 'IDENTIFICACIÓN ÚNICA'),
          h(Text, { key: 'idc', style: s.idCode }, p.codigoLegible),
          h(View, { key: 'idr', style: s.idRow }, [
            h(View, { key: 'chip' }, [
              h(Text, { key: 'cl', style: s.idChipLabel }, 'MICROCHIP ISO 11784/11785'),
              h(Text, { key: 'cv', style: s.idChip }, p.microchip || 'Sin microchip'),
            ]),
          ]),
        ]),

        h(View, { key: 'cols', style: s.cols }, [
          h(View, { key: 'pac', style: s.col }, [
            h(Text, { key: 't', style: s.sectionTitle }, 'Paciente'),
            Field('f1', 'Nombre', p.nombre),
            Field('f2', 'Especie', p.especie),
            Field('f3', 'Raza', p.raza),
            Field('f4', 'Sexo', p.sexo),
            Field('f5', 'Nacimiento', p.nacimiento),
            Field('f6', 'Pelaje', p.pelaje),
            Field('f7', 'Esterilizado', p.esterilizado),
          ]),
          h(View, { key: 'due', style: s.col }, [
            h(Text, { key: 't', style: s.sectionTitle }, 'Responsable'),
            Field('g1', 'Nombre', d.nombre),
            Field('g2', 'DNI', d.dni),
            Field('g3', 'Teléfono', d.telefono),
            Field('g4', 'Email', d.email),
            Field('g5', 'Domicilio', d.domicilio),
          ]),
        ]),

        h(Text, { key: 'vt', style: s.sectionTitle }, 'Plan de vacunación'),
        h(View, { key: 'tbl', style: s.table }, [
          h(View, { key: 'head', style: s.thead }, [
            h(Text, { key: 'a', style: [s.th, s.cVac] }, 'VACUNA'),
            h(Text, { key: 'b', style: [s.th, s.cFecha] }, 'APLICADA'),
            h(Text, { key: 'c', style: [s.th, s.cProx] }, 'PRÓXIMA'),
          ]),
          ...(vacunas.length === 0
            ? [h(View, { key: 'empty', style: s.emptyRow }, h(Text, { style: s.emptyText }, 'Sin vacunaciones registradas'))]
            : vacunas.map((v, i) =>
                h(View, { key: `r${i}`, style: i % 2 === 1 ? [s.tr, s.trAlt] : s.tr }, [
                  h(Text, { key: 'a', style: [s.td, s.cVac] }, v.nombre),
                  h(Text, { key: 'b', style: [s.td, s.cFecha] }, v.aplicada),
                  h(Text, { key: 'c', style: [s.td, s.cProx, v.proxima && v.proxima !== '—' ? s.proxPill : {}] }, v.proxima || '—'),
                ]))),
        ]),
      ]),

      h(View, { key: 'foot', style: s.footer, fixed: true }, [
        h(View, { key: 'qr', style: s.qrBox }, h(Text, { style: s.qrText }, 'Portal\nHuella\n(pronto)')),
        h(Text, { key: 'note', style: s.footNote }, [
          h(Text, { key: 'a', style: s.footStrong }, `${p.codigoLegible}  ·  ${p.nombre}\n`),
          h(Text, { key: 'b' }, 'Documento generado por Huella — Historia Clínica Electrónica animal. Verificable en el portal del ecosistema.'),
        ]),
      ]),
    ]),
  );
}
