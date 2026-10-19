export interface ProductStatusDefinition {
  readonly code: number;
  readonly label: string;
  readonly color: string;
}

/**
 * Single source of truth for every numeric product status code.
 *
 * Mirrors the backend catalog in api_rga `src/domain/product/WorkflowStatus.js`,
 * which in turn mirrors the `product_workflow_status` table. Consumers derive
 * labels and colors from here instead of re-hardcoding them.
 *
 * Labels are the ones the mobile views emit, which differ from the catalog's
 * canonical names in two places on purpose: code 3 reads "Preaprobado" to
 * sellers (the backend calls it "Aprobado") and code 20 reads "Por Pagar"
 * (the backend calls it "Apartado"). Because of the first one, "Preaprobado"
 * is NOT unique — it is code 3 in solicitudes and code 10 in publicaciones.
 * Resolve by code, never by label.
 */
export const PRODUCT_STATUSES: readonly ProductStatusDefinition[] = [
  { code: 1, label: 'En Revisión', color: '#F2BC59' },
  { code: 2, label: 'Negociación', color: '#F3A25A' },
  { code: 5, label: 'Renegociación', color: '#E8894A' },
  { code: 3, label: 'Preaprobado', color: '#DBE3F3' },
  { code: 4, label: 'Rechazado', color: '#EB6A6A' },
  { code: 6, label: 'Cerrada', color: '#D3DAE2' },

  { code: 10, label: 'Preaprobado', color: '#B5C7E7' },
  { code: 15, label: 'Ingresado', color: '#99C9C9' },
  { code: 16, label: 'Autentificado', color: '#9594B6' },
  { code: 17, label: 'Bolería P/C', color: '#C7A9C3' },
  { code: 18, label: 'Bolería', color: '#B693B1' },
  { code: 12, label: 'Completado', color: '#E3EFD9' },
  { code: 11, label: 'Activo', color: '#81BD53' },

  { code: 20, label: 'Por Pagar', color: '#FAF2A1' },
  { code: 21, label: 'Pagado', color: '#BDD57C' },

  { code: 13, label: 'Por Devolver', color: '#FCCC81' },
  { code: 14, label: 'Devuelto', color: '#F5B64E' },
  { code: 8, label: 'Donado', color: '#D89E49' },
  { code: 22, label: 'Perdido', color: '#F2B186' },
  { code: 23, label: 'Cancelado', color: '#D3DAE2' },

  { code: 99, label: 'Pendiente de revisión', color: '#AEB6C2' },
];

/**
 * Codes a publication moves through, in process order, from the moment the
 * request is accepted until it goes on sale.
 *
 * The order is explicit because the numbers do not carry it: 12 comes after
 * 18, and 15 to 18 were added later to fill gaps.
 */
export const PUBLICATION_FLOW_CODES: readonly number[] = [10, 15, 16, 17, 18, 12, 11];

export const ACTIVE_CODE = 11;

export function normalizeStatusText(status: string): string {
  return status.trim().toLowerCase();
}

export function findProductStatusByCode(code: number): ProductStatusDefinition | undefined {
  return PRODUCT_STATUSES.find((status) => status.code === code);
}

/**
 * Prefer `findProductStatusByCode`. Two codes share the label "Preaprobado",
 * so this returns the first match and cannot disambiguate them. It exists for
 * free-form status text that arrives without a code.
 */
export function findProductStatusByLabel(label: string): ProductStatusDefinition | undefined {
  const normalized = normalizeStatusText(label);
  return PRODUCT_STATUSES.find((status) => normalizeStatusText(status.label) === normalized);
}
