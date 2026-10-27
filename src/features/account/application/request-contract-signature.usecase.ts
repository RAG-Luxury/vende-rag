import type { AccountRepository } from '@/src/features/account/domain/account-repository';
import type { ContractSignatureSession } from '@/src/features/account/domain/contract-signature';

/**
 * Opens an embedded DocuSign session for the signed-in client.
 *
 * The returned url is single-use and expires in five minutes, so this runs when
 * the signing dialog opens — not on page load, and never cached.
 */
export async function requestContractSignatureUseCase(
  repository: AccountRepository,
  signal?: AbortSignal,
): Promise<ContractSignatureSession> {
  return repository.requestContractSignature(signal);
}
