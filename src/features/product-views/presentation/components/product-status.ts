import type { CSSProperties } from 'react';
import {
  findProductStatusByLabel,
  normalizeStatusText,
} from '@/src/features/product-views/domain/product-status';

const DEFAULT_COLOR = '#F3F4F6';

/**
 * Colors for status text with no numeric code of its own: pill labels the UI
 * composes ("Aprobado"), alternate gender forms the backend still emits, and
 * the payment/credit vocabularies, which are a different domain from the
 * product flow — "Pendiente" here is a seller payout, not the product status
 * 99 "Pendiente de revisión".
 *
 * Coded statuses live in `domain/product-status.ts`. Do not duplicate them.
 */
const SUPPLEMENTARY_STATUS_COLORS: Record<string, string> = {
  rechazada: '#EB6A6A',
  aprobada: '#DBE3F3',
  aprobado: '#d6e5fb',
  activa: '#81BD53',
  etiquetado: '#9EC5D8',
  inactiva: '#E6E7E7',
  inactivar: '#E6E7E7',
  heredit: '#B7B4DB',
  apartado: '#F0C8E0',
  'apartado perdido': '#F2B186',
  'venta cancelada': '#D3DAE2',
  cancelada: '#D3DAE2',
  venta: '#CCA0C2',
  pendiente: '#CD7352',
  liquidado: '#BDD57C',
  'pago parcial': '#FAF2A1',
  utilizado: '#FAF2A1',
  disponible: '#BDD57C',
};

function darken(hex: string, factor: number): string {
  const channel = (start: number) => {
    const value = Math.round(parseInt(hex.slice(start, start + 2), 16) * factor);
    return value.toString(16).padStart(2, '0');
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

export function getStatusStyle(status: string): CSSProperties {
  const background =
    findProductStatusByLabel(status)?.color ??
    SUPPLEMENTARY_STATUS_COLORS[normalizeStatusText(status)] ??
    DEFAULT_COLOR;
  return { backgroundColor: background, color: darken(background, 0.45) };
}
