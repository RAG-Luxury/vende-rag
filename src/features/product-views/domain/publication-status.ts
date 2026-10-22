import { ACTIVE_CODE, findProductStatusByCode } from './product-status';

/**
 * Stages a publication moves through between acceptance and going on sale.
 *
 * These used to be matched against `status_intern` strings, a second status
 * axis the backend has since removed: every one of them is now a numeric
 * status of its own (api_rga spec 001). Matching on text was never safe — a
 * renamed label silently matched nothing and the publication fell back to the
 * first stage — and the rename of "Recibido" to "Preaprobado" is exactly what
 * made it fail.
 */
export interface PublicationStep {
  readonly codes: readonly number[];
  readonly label: string;
}

const PREAPPROVED_CODE = 10;
const AUTHENTICATED_CODE = 16;
const BALLROOM_CODES = [17, 18] as const;

/** Entered the warehouse (15) or finished internal processing (12). */
const APPROVED_CODES = [15, 12] as const;

const INFO_GENERATED_CODE = 12;

/**
 * Milestones shown to the seller, a deliberately curated subset: the product
 * moves through more states than these four.
 *
 * Note that 15 "Ingresado" sits in the LAST step even though it comes early in
 * the real flow. That is inherited behaviour, not an oversight: to a seller,
 * a piece that reached the warehouse is already approved. Splitting 15 from 12
 * would be a product decision, not a refactor.
 */
export const PUBLICATION_TIMELINE_STEPS: readonly PublicationStep[] = [
  { codes: [PREAPPROVED_CODE], label: 'Preaprobado' },
  { codes: [AUTHENTICATED_CODE], label: 'Autentificación' },
  { codes: BALLROOM_CODES, label: 'Bolería' },
  { codes: APPROVED_CODES, label: 'Aprobado' },
];

/** Codes the seller sees as part of the publication journey, before it is active. */
export const PUBLICATION_PROGRESS_CODES: readonly number[] = PUBLICATION_TIMELINE_STEPS.flatMap(
  (step) => [...step.codes],
);

export function isPublicationProgress(code: number): boolean {
  return PUBLICATION_PROGRESS_CODES.includes(code);
}

/** Index of the step a publication is on; 0 when the code belongs to no step. */
export function resolvePublicationStepIndex(code: number): number {
  const index = PUBLICATION_TIMELINE_STEPS.findIndex((step) => step.codes.includes(code));
  return index === -1 ? 0 : index;
}

export function isPublicationApproved(code: number): boolean {
  return APPROVED_CODES.includes(code as (typeof APPROVED_CODES)[number]);
}

/** "Información" is only fully generated once the product reaches Completado. */
export function isPublicationInfoGenerated(code: number): boolean {
  return code === INFO_GENERATED_CODE;
}

/**
 * Pill text for a product still inside the publication journey. Internal
 * milestones (Autentificado, Bolería) are not exposed to sellers: they only
 * see whether the piece is approved yet.
 */
export function resolvePublicationPillLabel(code: number): string {
  if (isPublicationApproved(code)) return 'Aprobado';
  return findProductStatusByCode(PREAPPROVED_CODE)?.label ?? 'Preaprobado';
}

/**
 * Three-bucket grouping of a publication, mirroring the mobile app
 * (`RAG-Front` -> `publication_stages.dart`) one-to-one: the numeric status
 * decides, and the text is only a fallback for responses that arrive without a
 * code. Unlike the seller timeline above, this DOES surface Bolería as its own
 * bucket, matching the mobile grouping.
 */
export type PublicationStage = 'En proceso' | 'Activo' | 'Bolería';

/** Chip order, same as mobile's `kPublicationFilterLabels`. */
export const PUBLICATION_STAGES: readonly PublicationStage[] = [
  'En proceso',
  'Activo',
  'Bolería',
];

export function resolvePublicationStage(code: number, statusText = ''): PublicationStage {
  if (code === ACTIVE_CODE) return 'Activo'; // 11
  if ((BALLROOM_CODES as readonly number[]).includes(code)) return 'Bolería'; // 17, 18
  if (code > 0) return 'En proceso'; // 10, 12, 15, 16, ...

  // Fallback por texto (cuando no llega el code), espejo del mobile.
  const text = statusText.trim().toLowerCase();
  if (text.startsWith('boler')) return 'Bolería';
  if (text === 'activo') return 'Activo';
  return 'En proceso';
}
