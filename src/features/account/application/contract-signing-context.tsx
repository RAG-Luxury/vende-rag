'use client';

import { createContext, useContext } from 'react';

/**
 * Which contract signing flow the profile offers.
 *
 * `upload` is the flow that exists today: the browser renders the contract,
 * generates a PDF and uploads it. `docusign` opens an embedded DocuSign
 * session instead.
 *
 * It arrives through context rather than being read from env in the component
 * because `presentation` may not reach into `shared/infrastructure` — the value
 * is supplied by `app/providers.tsx`, the composition root, exactly like the
 * account repository.
 */
export type ContractSigningFlow = 'upload' | 'docusign';

/**
 * Defaults to `upload`. Switching to `docusign` before api_rga has its
 * DocuSign credentials in that environment would leave sellers unable to sign
 * at all, so the safe value is the one that already works.
 */
export const ContractSigningContext = createContext<ContractSigningFlow>('upload');

export function useContractSigningFlow(): ContractSigningFlow {
  return useContext(ContractSigningContext);
}
