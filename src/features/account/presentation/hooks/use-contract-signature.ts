'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useAccountRepository } from '@/src/features/account/application/account-repository-context';
import { profileQueryKeys } from '@/src/features/account/application/profile-query-keys';
import { requestContractSignatureUseCase } from '@/src/features/account/application/request-contract-signature.usecase';
import { confirmContractSignatureUseCase } from '@/src/features/account/application/confirm-contract-signature.usecase';

/**
 * Requests the single-use signing url. It is a mutation, not a query: the url
 * expires in five minutes and burns on first use, so it must never be cached
 * or refetched behind the user's back.
 */
export function useRequestContractSignature() {
  const repository = useAccountRepository();
  const [isPending, setIsPending] = useState(false);

  const requestSignature = useCallback(async () => {
    setIsPending(true);
    try {
      return await requestContractSignatureUseCase(repository);
    } finally {
      setIsPending(false);
    }
  }, [repository]);

  return { requestSignature, isPending };
}

/**
 * Archives the signed contract without waiting for DocuSign's webhook, then
 * refreshes the profile so the contract shows up right away.
 */
export function useConfirmContractSignature(clientId: number) {
  const repository = useAccountRepository();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (envelopeId: string) => confirmContractSignatureUseCase(repository, envelopeId),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: profileQueryKeys.detail(clientId) }),
  });
}
