import type { AccountRepository } from '@/src/features/account/domain/account-repository';
import type { ContractSignatureConfirmation } from '@/src/features/account/domain/contract-signature';

/**
 * Archives the signed contract as soon as the client finishes signing.
 *
 * DocuSign's Connect webhook remains the reliable path — it retries and
 * survives the client closing the browser — but it cannot reach a local API
 * and takes time. This closes the loop immediately.
 */
export async function confirmContractSignatureUseCase(
  repository: AccountRepository,
  envelopeId: string,
  signal?: AbortSignal,
): Promise<ContractSignatureConfirmation> {
  return repository.confirmContractSignature(envelopeId, signal);
}
