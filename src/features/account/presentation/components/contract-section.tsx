'use client';

import { Icon } from '@iconify/react';
import { useState } from 'react';

import { useContractSigningFlow } from '@/src/features/account/application/contract-signing-context';
import { useProfile } from '../hooks/use-profile';
import { ContractGenerator } from './contract/contract-generator';
import { ContractSignatureFrame } from './contract/contract-signature-frame';
import { ProfileAccordion } from './profile-accordion';

interface ContractSectionProps {
  clientId: number;
  open: boolean;
  onToggle: () => void;
}

export function ContractSection({ clientId, open, onToggle }: ContractSectionProps) {
  return (
    <ProfileAccordion
      icon={<Icon icon="ion:document-text-outline" className="size-6" />}
      label="Contrato"
      open={open}
      onToggle={onToggle}
    >
      <ContractContent clientId={clientId} />
    </ProfileAccordion>
  );
}

export interface ContractContentProps {
  clientId: number;
}

export function ContractContent({ clientId }: ContractContentProps) {
  const { data: profile, isLoading, isError } = useProfile(clientId);
  const [signingOpen, setSigningOpen] = useState(false);

  // Un solo botón; el flujo configurado decide qué abre. Mientras api_rga no
  // tenga sus credenciales de DocuSign en ese entorno, sigue siendo el de hoy.
  const usesDocusign = useContractSigningFlow() === 'docusign';

  return (
    <>
      <p className="text-base text-neutral-500">
        Consulta los términos y condiciones firmados para la venta de tus productos.
      </p>

      {isLoading ? (
        <p className="mt-5 text-base text-neutral-400">Cargando...</p>
      ) : isError ? (
        <p className="mt-5 text-base text-red-600">No pudimos cargar tu contrato.</p>
      ) : profile?.contractSigned && profile.contract ? (
        <a
          href={profile.contract}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-neutral-300 text-base font-medium text-neutral-700"
        >
          <Icon icon="ion:document-outline" className="size-5" />
          Ver Contrato
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setSigningOpen(true)}
          className="mt-5 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-neutral-300 text-base font-medium text-neutral-700"
        >
          <Icon icon={usesDocusign ? 'ion:pencil-outline' : 'ion:create-outline'} className="size-5" />
          {usesDocusign ? 'Firmar Contrato' : 'Generar Contrato'}
        </button>
      )}

      {signingOpen ? (
        usesDocusign ? (
          <ContractSignatureFrame clientId={clientId} onClose={() => setSigningOpen(false)} />
        ) : (
          <ContractGenerator clientId={clientId} onClose={() => setSigningOpen(false)} />
        )
      ) : null}
    </>
  );
}
