'use client';

import type { ReactNode } from 'react';
import {
  ContractSigningContext,
  type ContractSigningFlow,
} from '@/src/features/account/application/contract-signing-context';

interface ContractSigningProviderProps {
  flow: ContractSigningFlow;
  children: ReactNode;
}

export function ContractSigningProvider({ flow, children }: ContractSigningProviderProps) {
  return <ContractSigningContext.Provider value={flow}>{children}</ContractSigningContext.Provider>;
}
