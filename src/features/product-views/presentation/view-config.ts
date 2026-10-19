import {
  findProductStatusByCode,
  normalizeStatusText,
} from '@/src/features/product-views/domain/product-status';
import {
  ACTIVE_CODE,
} from '@/src/features/product-views/domain/product-status';
import {
  isPublicationApproved,
  isPublicationProgress,
} from '@/src/features/product-views/domain/publication-status';
import type {
  Product,
  ProductView,
} from '@/src/features/product-views/domain/product-view-repository';
import { AppError } from '@/src/shared/domain/errors';

export type CurrencyAmount = 'salePrice' | 'earning' | 'pending' | 'paid';

export interface SummaryConfig {
  label: string;
  icon: string;
  format: 'count' | 'currency';
  matches: (product: Product) => boolean;
  amount?: CurrencyAmount;
}

export interface CardSecondaryConfig {
  label: string;
  amount: CurrencyAmount;
}

export interface ViewConfig {
  title: string;
  searchPlaceholder: string;
  emptyText: string;
  backHref?: string;
  cardSecondary: CardSecondaryConfig;
  summary: readonly SummaryConfig[];
}

const SALE_PRICE_SECONDARY: CardSecondaryConfig = { label: 'Precio de Venta', amount: 'salePrice' };


function statusIncludes(...needles: readonly string[]) {
  return (product: Product) => {
    const status = product.status.trim().toLowerCase();
    return needles.some((needle) => status.includes(needle));
  };
}

/**
 * Match on the numeric status, not on its label. The label is presentation
 * text: it was renamed by the backend's status refactor, two codes share
 * "Preaprobado", and the sales view derives its label from payment data rather
 * than from the code.
 */
function statusIs(...codes: readonly number[]) {
  return (product: Product) => codes.includes(product.statusCode);
}

/** Label for a known numeric product status code, from the single source of truth. */
function statusLabel(code: number): string {
  const status = findProductStatusByCode(code);
  if (!status) {
    throw new AppError(`Unknown product status code: ${code}`);
  }
  return status.label;
}

function isInPublicationProgress(product: Product): boolean {
  return isPublicationProgress(product.statusCode);
}

export const VIEW_CONFIG: Record<ProductView, ViewConfig> = {
  solicitudes: {
    title: 'Solicitudes',
    searchPlaceholder: 'Busca tus solicitudes',
    emptyText: 'No se encontraron solicitudes',
    cardSecondary: SALE_PRICE_SECONDARY,
    summary: [
      {
        label: statusLabel(3),
        icon: 'ion:checkmark-circle-outline',
        format: 'count',
        matches: statusIs(3),
      },
      {
        label: statusLabel(2),
        icon: 'ion:sync-outline',
        format: 'count',
        // Renegociación (5) counts here: it is the same price conversation, one round later.
        matches: statusIs(2, 5),
      },
      {
        label: statusLabel(1),
        icon: 'ion:refresh-outline',
        format: 'count',
        matches: statusIs(1),
      },
      {
        label: statusLabel(4),
        icon: 'ion:close-circle-outline',
        format: 'count',
        matches: statusIs(4),
      },
    ],
  },
  publicaciones: {
    title: 'Publicaciones',
    searchPlaceholder: 'Busca tus publicaciones',
    emptyText: 'No se encontraron publicaciones',
    cardSecondary: SALE_PRICE_SECONDARY,
    summary: [
      {
        label: 'Preaprobado',
        icon: 'ion:time-outline',
        format: 'count',
        matches: (product: Product) =>
          isInPublicationProgress(product) && !isPublicationApproved(product.statusCode),
      },
      {
        label: 'Aprobado',
        icon: 'ion:checkmark-circle-outline',
        format: 'count',
        matches: (product: Product) =>
          isInPublicationProgress(product) && isPublicationApproved(product.statusCode),
      },
      {
        label: statusLabel(11),
        icon: 'ion:pricetag-outline',
        format: 'count',
        matches: statusIs(ACTIVE_CODE),
      },
    ],
  },
  devoluciones: {
    title: 'Devoluciones',
    searchPlaceholder: 'Busca tus devoluciones',
    emptyText: 'No se encontraron devoluciones',
    cardSecondary: SALE_PRICE_SECONDARY,
    summary: [
      {
        label: statusLabel(13),
        icon: 'ion:arrow-undo-outline',
        format: 'count',
        matches: statusIs(13),
      },
      {
        label: statusLabel(14),
        icon: 'ion:checkmark-circle-outline',
        format: 'count',
        matches: statusIs(14),
      },
    ],
  },
  ventas: {
    title: 'Ventas',
    searchPlaceholder: 'Busca tus ventas',
    emptyText: 'No se encontraron ventas',
    backHref: '/',
    cardSecondary: { label: 'Por pagar', amount: 'pending' },
    summary: [
      {
        label: statusLabel(20),
        icon: 'ion:lock-closed-outline',
        format: 'currency',
        matches: statusIncludes(normalizeStatusText(statusLabel(20))),
        amount: 'pending',
      },
      {
        label: statusLabel(21),
        icon: 'ion:cash-outline',
        format: 'currency',
        matches: statusIncludes(normalizeStatusText(statusLabel(21))),
        amount: 'paid',
      },
    ],
  },
};
