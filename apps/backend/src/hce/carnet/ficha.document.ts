// Ficha del animal (hoja A4) construida con @react-pdf/renderer.
// A diferencia del carnet (tarjeta tipo DNI, ver carnet.document.ts), esto es
// el registro completo para imprimir/archivar en papel: identificación,
// datos del paciente/responsable y la tabla de vacunas/desparasitaciones/
// tratamientos preventivos (todo lo cargado en hce.vacunaciones — el campo
// `producto` es libre, así que ya cubre dewormers sin necesitar un `tipo`
// separado en el schema). "Llena o no": si el animal no tiene nada cargado,
// la tabla igual se imprime con una fila de estado vacío.
// Sin JSX a propósito, igual que carnet.document.ts (ver esa nota).
import { createElement as h } from 'react';
import {
  Document, Page, View, Text, StyleSheet, Svg, Ellipse, Image,
} from '@react-pdf/renderer';
import type { CarnetData } from './carnet.types';

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
  page: { paddingTop: 0, paddingBottom: 32, paddingHorizontal: 0, fontFamily: 'Helvetica', color: C.ink, fontSize: 10 },

  header: { backgroundColor: C.teal, paddingHorizontal: 30, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  wordmark: { color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 26, marginLeft: 10, letterSpacing: 0.5 },
  headerRight: { alignItems: 'flex-end' },
  headerKicker: { color: '#BFE4DC', fontSize: 8.5, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5 },
  headerSub: { color: C.white, fontSize: 9, marginTop: 2 },

  body: { paddingHorizontal: 30, paddingTop: 22 },

  idBox: { borderWidth: 1, borderColor: C.line, borderRadius: 8, backgroundColor: C.bg, padding: 14, marginBottom: 18 },
  idLabel: { color: C.muted, fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1.2, marginBottom: 3 },
  idCode: { color: C.tealDark, fontSize: 22, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  idRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  idChipLabel: { color: C.muted, fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1.2 },
  idChip: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 2 },

  sectionTitle: { color: C.teal, fontSize: 9.5, fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  cols: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  col: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 14 },
  field: { flexDirection: 'row', marginBottom: 6 },
  fieldLabel: { color: C.muted, width: 74, fontSize: 9 },
  fieldValue: { flex: 1, fontSize: 9.5, fontFamily: 'Helvetica-Bold' },

  table: { borderWidth: 1, borderColor: C.line, borderRadius: 8, overflow: 'hidden', marginBottom: 18 },
  thead: { flexDirection: 'row', backgroundColor: C.teal },
  th: { color: C.white, fontSize: 8.5, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5, paddingVertical: 8, paddingHorizontal: 10 },
  tr: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line },
  trAlt: { backgroundColor: C.bg },
  td: { fontSize: 9.5, paddingVertical: 8, paddingHorizontal: 10 },
  cVac: { flex: 2.2 },
  cFecha: { flex: 1.3 },
  cProx: { flex: 1.3 },
  proxPill: { color: C.accent, fontFamily: 'Helvetica-Bold' },

  emptyRow: { padding: 16, alignItems: 'center' },
  emptyText: { color: C.muted, fontSize: 9, fontStyle: 'italic' },

  footer: { position: 'absolute', bottom: 18, left: 30, right: 30, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  qrBox: { width: 58, height: 58, borderWidth: 1, borderColor: C.line, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  footNote: { color: C.muted, fontSize: 8, textAlign: 'right', maxWidth: 340 },
  footStrong: { color: C.ink, fontFamily: 'Helvetica-Bold' },
});

function PawLogo(size = 30, color = C.white) {
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

/** Devuelve el elemento react-pdf de la ficha A4. El service lo pasa a renderToBuffer. */
export function FichaDocument(data: CarnetData) {
  const p = data.paciente;
  const d = data.dueno;
  const vacunas = data.vacunaciones || [];

  return h(Document as any, {
    title: `Ficha del animal — ${p.nombre}`,
    author: 'Huella',
    subject: 'Ficha clínica del paciente',
  },
    h(Page as any, { size: 'A4', style: s.page }, [

      h(View, { key: 'h', style: s.header }, [
        h(View, { key: 'brand', style: s.brandRow }, [
          PawLogo(),
          h(Text, { key: 'wm', style: s.wordmark }, 'Huella'),
        ]),
        h(View, { key: 'hr', style: s.headerRight }, [
          h(Text, { key: 'k', style: s.headerKicker }, 'FICHA DEL ANIMAL'),
          h(Text, { key: 'e', style: s.headerSub }, `Emitida ${data.emitidoEl}`),
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

        h(Text, { key: 'vt', style: s.sectionTitle }, 'Vacunas, desparasitaciones y tratamientos preventivos'),
        h(View, { key: 'tbl', style: s.table }, [
          h(View, { key: 'head', style: s.thead }, [
            h(Text, { key: 'a', style: [s.th, s.cVac] }, 'PRODUCTO'),
            h(Text, { key: 'b', style: [s.th, s.cFecha] }, 'APLICADO'),
            h(Text, { key: 'c', style: [s.th, s.cProx] }, 'PRÓXIMA DOSIS'),
          ]),
          ...(vacunas.length === 0
            ? [h(View, { key: 'empty', style: s.emptyRow }, h(Text, { style: s.emptyText }, 'Sin registros cargados todavía'))]
            : vacunas.map((v, i) =>
                h(View, { key: `r${i}`, style: i % 2 === 1 ? [s.tr, s.trAlt] : s.tr }, [
                  h(Text, { key: 'a', style: [s.td, s.cVac] }, v.nombre),
                  h(Text, { key: 'b', style: [s.td, s.cFecha] }, v.aplicada),
                  h(Text, { key: 'c', style: [s.td, s.cProx, v.proxima && v.proxima !== '—' ? s.proxPill : {}] }, v.proxima || '—'),
                ]))),
        ]),
      ]),

      h(View, { key: 'foot', style: s.footer, fixed: true }, [
        h(Image, { key: 'qr', style: s.qrBox, src: data.qrDataUrl }),
        h(Text, { key: 'note', style: s.footNote }, [
          h(Text, { key: 'a', style: s.footStrong }, `${p.codigoLegible}  ·  ${p.nombre}\n`),
          h(Text, { key: 'b' }, 'Documento generado por Huella — Historia Clínica Electrónica animal. Verificable en el portal del ecosistema.'),
        ]),
      ]),
    ]),
  );
}
