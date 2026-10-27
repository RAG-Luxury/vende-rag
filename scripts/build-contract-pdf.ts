#!/usr/bin/env node

/**
 * Genera el contrato de consignación como PDF con CAPA DE TEXTO REAL.
 *
 * Por qué existe: el flujo del navegador (`generate-contract-pdf.ts`) usa
 * html2canvas, o sea rasteriza el DOM y mete una imagen en el PDF. El
 * resultado es una foto de texto: no se busca, no se copia, no lo lee un
 * lector de pantalla — y DocuSign no puede anclar pestañas a algo que no
 * tiene texto.
 *
 * Las cláusulas se importan de `contract-clauses.ts`, su fuente real, para que
 * este PDF no sea otra copia del texto legal que pueda divergir.
 *
 *   node --experimental-strip-types scripts/build-contract-pdf.ts [salida.pdf]
 */

import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { jsPDF } from 'jspdf';

import {
  CONTRACT_CLAUSES,
  PAGE_1_CLAUSE_COUNT,
} from '../src/features/account/presentation/components/contract/contract-clauses.ts';

/**
 * Marcadores que DocuSign usa para ubicar las pestañas por anchorString.
 *
 * Se dibujan en BLANCO: quedan invisibles para quien lee el contrato, pero
 * DocuSign los encuentra en la capa de texto y pone la pestaña encima. Es la
 * técnica estándar de anchor tabs; la alternativa es posicionar por
 * coordenadas absolutas, que se rompe apenas cambia una cláusula de largo.
 */
const ANCHORS = {
  partiesName: '[[NOMBRE_PARTES]]',
  signatureName: '[[NOMBRE_FIRMA]]',
  signature: '[[FIRMA]]',
  date: '[[FECHA]]',
} as const;

// Carta, igual que el contrato que se renderiza hoy: 216mm x 279mm, con 25mm
// de margen y texto de 13px (~9.75pt).
const PAGE = { width: 216, height: 279, margin: 25 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const BODY_SIZE = 9.75;
const LINE_HEIGHT = 4.6;

const INTRO_BEFORE_NAME =
  'Entre RAG Luxury Resale SAPI de CV, representado en este acto por Ana Paula Godoy Paredes, ' +
  'en adelante denominado "El Consignatario", y ';
const INTRO_AFTER_NAME = 'el consignador, en adelante denominado "El Seller".';

const INTRO_PARAGRAPHS = [
  '"El Seller" es de nacionalidad mexicana, mayor de edad y con capacidad legal para celebrar ' +
    'el presente contrato.',
  '"El Seller" es propietario de los productos que se consignan en virtud de este contrato, ' +
    '"El Consignatario" se dedica a la venta de productos similares a los consignados, y que ' +
    'ambas partes están de acuerdo en celebrar el presente contrato de consignación bajo las ' +
    'siguientes cláusulas.',
];

function createDoc(): jsPDF {
  return new jsPDF({ unit: 'mm', format: [PAGE.width, PAGE.height] });
}

/** Escribe un párrafo con salto de línea automático y devuelve la nueva Y. */
function paragraph(doc: jsPDF, text: string, y: number, indent = 0): number {
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - indent) as string[];
  let currentY = y;
  for (const line of lines) {
    doc.text(line, PAGE.margin + indent, currentY);
    currentY += LINE_HEIGHT;
  }
  return currentY;
}

/** Cláusula numerada: el número colgado a la izquierda, el texto sangrado. */
function clause(doc: jsPDF, number: number, text: string, y: number): number {
  doc.text(`${number}.`, PAGE.margin, y);
  const after = paragraph(doc, text, y, 7);
  return after + 1.6;
}

/** Marcador invisible para anclar una pestaña de DocuSign. */
function anchor(doc: jsPDF, marker: string, x: number, y: number): void {
  doc.setTextColor(255, 255, 255);
  doc.text(marker, x, y);
  doc.setTextColor(0, 0, 0);
}

function buildPageOne(doc: jsPDF): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.25);
  doc.text('CONTRATO DE CONSIGNACIÓN DE PRODUCTOS DE LUJO', PAGE.width / 2, PAGE.margin + 4, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(BODY_SIZE);
  let y = PAGE.margin + 14;

  y = paragraph(doc, INTRO_BEFORE_NAME.trimEnd(), y);

  // A dedicated line prevents the DocuSign value from sharing physical space
  // with immutable legal text, regardless of the signer's name length.
  anchor(doc, ANCHORS.partiesName, PAGE.margin, y);
  y += LINE_HEIGHT;

  y = paragraph(doc, INTRO_AFTER_NAME, y);
  y += 2;

  for (const text of INTRO_PARAGRAPHS) {
    y = paragraph(doc, text, y) + 2;
  }

  doc.setFont('helvetica', 'bold');
  y += 2;
  doc.text('CLÁUSULAS', PAGE.margin, y);
  doc.setFont('helvetica', 'normal');
  y += LINE_HEIGHT + 1;

  for (let i = 0; i < PAGE_1_CLAUSE_COUNT; i += 1) {
    const text = CONTRACT_CLAUSES[i];
    if (text === undefined) throw new Error(`Missing contract clause ${i + 1}`);
    y = clause(doc, i + 1, text, y);
  }
}

function buildPageTwo(doc: jsPDF): void {
  doc.addPage([PAGE.width, PAGE.height]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(BODY_SIZE);

  let y = PAGE.margin;
  for (let i = PAGE_1_CLAUSE_COUNT; i < CONTRACT_CLAUSES.length; i += 1) {
    const text = CONTRACT_CLAUSES[i];
    if (text === undefined) throw new Error(`Missing contract clause ${i + 1}`);
    y = clause(doc, i + 1, text, y);
  }

  y += 6;
  doc.text(
    'En buena fe, las partes firman el presente contrato en Guadalajara, Jalisco a',
    PAGE.margin,
    y,
  );
  const anchoFrase = doc.getTextWidth(
    'En buena fe, las partes firman el presente contrato en Guadalajara, Jalisco a ',
  );
  anchor(doc, ANCHORS.date, PAGE.margin + anchoFrase, y);

  // Bloque de firmas, dos columnas como el contrato actual.
  const baseY = PAGE.height - PAGE.margin - 26;
  const colWidth = (CONTENT_WIDTH - 20) / 2;
  const leftX = PAGE.margin;
  const rightX = PAGE.margin + colWidth + 20;

  anchor(doc, ANCHORS.signature, leftX + 4, baseY - 6);

  doc.setLineWidth(0.3);
  doc.line(leftX, baseY, leftX + colWidth, baseY);
  doc.line(rightX, baseY, rightX + colWidth, baseY);

  doc.setFontSize(8.5);
  doc.text('Firma del Seller', leftX + colWidth / 2, baseY + 5, { align: 'center' });
  doc.text('Ana Paula Godoy Paredes', rightX + colWidth / 2, baseY + 5, { align: 'center' });
  doc.text('RAG Luxury Resale SAPI de CV', rightX + colWidth / 2, baseY + 9.5, { align: 'center' });

  doc.text('Nombre del Seller:', leftX, baseY + 12);
  anchor(doc, ANCHORS.signatureName, leftX + doc.getTextWidth('Nombre del Seller: '), baseY + 12);
}

function main(): void {
  const salida = process.argv[2] ?? 'contrato-rag-template.pdf';

  const doc = createDoc();
  buildPageOne(doc);
  buildPageTwo(doc);

  writeFileSync(salida, Buffer.from(doc.output('arraybuffer')));

  process.stdout.write(
    `PDF generado: ${salida}\n` +
      `  cláusulas:  ${CONTRACT_CLAUSES.length} (${PAGE_1_CLAUSE_COUNT} en la página 1)\n` +
      `  anclas:     ${Object.values(ANCHORS).join('  ')}\n`,
  );
}

main();
