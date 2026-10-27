/**
 * Embedded DocuSign signing session.
 *
 * `url` is single-use and expires in five minutes, which is why it is requested
 * when the signing dialog opens rather than ahead of time, and never stored.
 */
export interface ContractSignatureSession {
  readonly envelopeId: string;
  readonly url: string;
  /** True while api_rga runs without DocuSign credentials. */
  readonly mock: boolean;
}

/** Outcome of archiving the signed contract right after signing. */
export interface ContractSignatureConfirmation {
  /** True when this call is what stored the contract. */
  readonly stored: boolean;
  /** True when it was already stored — usually the Connect webhook won the race. */
  readonly alreadySigned: boolean;
}

/**
 * How DocuSign reports the end of a signing session. These are the values it
 * appends to the return url as `?event=`.
 */
export type ContractSigningOutcome =
  | 'signing_complete'
  | 'cancel'
  | 'decline'
  | 'ttl_expired'
  | 'exception';

const KNOWN_OUTCOMES: readonly ContractSigningOutcome[] = [
  'signing_complete',
  'cancel',
  'decline',
  'ttl_expired',
  'exception',
];

/**
 * Anything unrecognized is reported as `exception`, never as success. DocuSign
 * adds events over time, and treating an unknown one as `signing_complete`
 * would mark a contract as signed on an outcome nobody has seen yet.
 */
export function readContractSigningOutcome(raw: string | null | undefined): ContractSigningOutcome {
  if (!raw) return 'exception';
  return KNOWN_OUTCOMES.includes(raw as ContractSigningOutcome)
    ? (raw as ContractSigningOutcome)
    : 'exception';
}

/** Message type our return page posts to the parent window. */
export const CONTRACT_SIGNING_MESSAGE = 'rag:contract-signing-outcome';

export interface ContractSigningMessage {
  readonly type: typeof CONTRACT_SIGNING_MESSAGE;
  readonly outcome: ContractSigningOutcome;
}

/**
 * The signing iframe is cross-origin, so the parent cannot read its location.
 * The trip back goes through a page we own, which posts this message to the
 * parent — making origin validation the entire security boundary. Without it,
 * any site could claim a contract was signed.
 *
 * DocuSign's own origin is not trusted either: the signing frame never posts to
 * us, only our return page does.
 */
export function isContractSigningMessage(
  event: MessageEvent,
  expectedOrigin: string,
): event is MessageEvent<ContractSigningMessage> {
  if (event.origin !== expectedOrigin) return false;

  const data: unknown = event.data;
  if (typeof data !== 'object' || data === null) return false;

  return (data as { type?: unknown }).type === CONTRACT_SIGNING_MESSAGE;
}
