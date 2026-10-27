'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import {
  CONTRACT_SIGNING_MESSAGE,
  readContractSigningOutcome,
} from '@/src/features/account/domain/contract-signature';

/**
 * Return page for the embedded DocuSign session.
 *
 * DocuSign redirects the signing iframe here and appends `?event=`. Because the
 * iframe is cross-origin the parent cannot read its location, so this page —
 * which IS on our origin — relays the outcome with `postMessage`. It renders
 * almost nothing: the user sees the dialog behind it take over.
 */
export default function ContractSignedPage() {
  return (
    <Suspense fallback={null}>
      <ContractSignedRelay />
    </Suspense>
  );
}

function ContractSignedRelay() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const outcome = readContractSigningOutcome(searchParams.get('event'));
    const insideFrame = window.parent !== window;

    if (insideFrame) {
      // Target origin explícito, nunca '*': el mensaje dice que un contrato se
      // firmó y no tiene por qué ser legible por una página que nos embeba.
      window.parent.postMessage(
        { type: CONTRACT_SIGNING_MESSAGE, outcome },
        window.location.origin,
      );
      return;
    }

    // Fuera del iframe no hay a quién avisar. Pasa si alguien abre la url
    // directo o si el navegador rompió el contexto: el perfil es la única
    // fuente de verdad del estado del contrato, así que lo mandamos ahí.
    router.replace('/perfil');
  }, [router, searchParams]);

  return (
    <p className="p-8 text-center text-base text-neutral-500" role="status">
      Guardando tu contrato...
    </p>
  );
}
