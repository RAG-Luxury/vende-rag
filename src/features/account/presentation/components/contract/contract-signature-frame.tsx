'use client';

import { Icon } from '@iconify/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type ContractSignatureSession,
  type ContractSigningOutcome,
  isContractSigningMessage,
} from '@/src/features/account/domain/contract-signature';
import { HttpError } from '@/src/shared/domain/errors';
import { useToast } from '@/src/shared/ui/toast';
import {
  useConfirmContractSignature,
  useRequestContractSignature,
} from '../../hooks/use-contract-signature';

interface ContractSignatureFrameProps {
  clientId: number;
  onClose: () => void;
}

const OUTCOME_MESSAGE: Record<Exclude<ContractSigningOutcome, 'signing_complete'>, string> = {
  cancel: 'Cerraste la firma sin terminar. Puedes retomarla cuando quieras.',
  decline: 'Rechazaste el contrato. Si fue un error, vuelve a abrirlo.',
  ttl_expired: 'La sesión de firma expiró. Ábrela de nuevo para continuar.',
  exception: 'Algo salió mal durante la firma. Intenta de nuevo.',
};

const CONFIRMATION_ATTEMPTS = 5;
const CONFIRMATION_INTERVAL_MS = 1_000;

export function ContractSignatureFrame({ clientId, onClose }: ContractSignatureFrameProps) {
  const { showToast } = useToast();
  const { mutateAsync: confirmSignature, isPending: isArchiving } =
    useConfirmContractSignature(clientId);
  const { requestSignature, isPending } = useRequestContractSignature();
  const [session, setSession] = useState<ContractSignatureSession | null>(null);
  const [requestError, setRequestError] = useState(false);
  const [signed, setSigned] = useState(false);
  const [tardaDemasiado, setTardaDemasiado] = useState(false);
  const [frameListo, setFrameListo] = useState(false);
  const requestSequence = useRef(0);
  const frameLoads = useRef(0);
  const isConfirming = useRef(false);
  const confirmationQueued = useRef(false);

  // La url se quema al primer uso y vive cinco minutos, así que se pide al
  // abrir el diálogo y una sola vez. El ref evita un segundo pedido si React
  // vuelve a montar el efecto en desarrollo.
  const requested = useRef(false);
  const pedirFirma = useCallback(async () => {
    const requestId = ++requestSequence.current;
    requested.current = true;
    setTardaDemasiado(false);
    setRequestError(false);
    setFrameListo(false);

    try {
      const nextSession = await requestSignature();
      if (requestSequence.current === requestId) setSession(nextSession);
    } catch {
      if (requestSequence.current === requestId) setRequestError(true);
    }
  }, [requestSignature]);

  useEffect(() => {
    if (requested.current) return;
    pedirFirma();
  }, [pedirFirma]);

  /**
   * Salida para el caso en que la respuesta nunca llega al componente.
   *
   * Pasa de verdad en desarrollo: si Fast Refresh remonta el componente
   * mientras el pedido está en vuelo, la respuesta llega a una instancia que
   * ya no existe y el diálogo queda en "Preparando tu contrato..." para
   * siempre, sin error y sin forma de reintentar.
   *
   * `isPending` es lo que distingue ese caso de una espera lenta. Mientras el
   * pedido sigue vivo no hay nada que rescatar, y arrancar el reloj igual
   * hacía que una conexión lenta mostrara "esto está tardando" y, acto
   * seguido, el contrato: un error que se desmiente solo.
   */
  useEffect(() => {
    if (session || requestError || isPending) return undefined;
    const timer = window.setTimeout(() => setTardaDemasiado(true), 12_000);
    return () => window.clearTimeout(timer);
  }, [session, requestError, isPending]);

  /**
   * Archiva el contrato firmado.
   *
   * `avisarSiFalla` separa dos cosas que no son lo mismo: el `load` del iframe
   * es una CORAZONADA —navega varias veces durante la firma y casi siempre el
   * sobre todavia esta abierto—, mientras que el postMessage de la pagina de
   * retorno es un HECHO: el cliente termino. Solo el segundo tiene derecho a
   * molestar al usuario con un error.
   */
  const archiveCompletedSignature = useCallback(async (avisarSiFalla = false) => {
    if (!session) return;
    if (isConfirming.current) {
      confirmationQueued.current = true;
      return;
    }
    isConfirming.current = true;

    try {
      do {
        confirmationQueued.current = false;

        for (let attempt = 0; attempt < CONFIRMATION_ATTEMPTS; attempt += 1) {
          try {
            await confirmSignature(session.envelopeId);
            setSigned(true);
            return;
          } catch (error) {
            // 409 = el sobre existe pero todavia no esta firmado. NO es un
            // fallo: el iframe navega varias veces durante la firma y cada
            // navegacion dispara este intento, asi que lo normal es que las
            // primeras veces el sobre siga abierto. Agotar los reintentos
            // aqui significa "aun no termino", y se sale en silencio.
            // Sin `instanceof`: Next puede cargar la clase de error en dos
            // bundles distintos y entonces `instanceof` da false en silencio,
            // convirtiendo un "todavia no firmo" en un error visible.
            const status = error instanceof HttpError ? error.status : (error as { status?: number })?.status;
            const todaviaFirmando = status === 409;
            if (!todaviaFirmando) throw error;
            if (attempt < CONFIRMATION_ATTEMPTS - 1) {
              await new Promise((resolve) =>
                window.setTimeout(resolve, CONFIRMATION_INTERVAL_MS),
              );
            }
          }
        }
      } while (confirmationQueued.current);
    } catch {
      // Solo se avisa cuando fallo algo de verdad —red caida, 403, 500— Y
      // ademas sabemos que el cliente ya firmo. Un intento especulativo que
      // falla se descarta sin decir nada.
      if (avisarSiFalla) {
        showToast('No pudimos guardar tu contrato firmado. Vuelve a intentarlo.', 'error');
      }
    } finally {
      isConfirming.current = false;
    }
  }, [confirmSignature, session, showToast]);

  const handleFrameLoad = useCallback(() => {
    frameLoads.current += 1;

    // DocuSign encadena varias redirecciones antes de mostrar el documento y
    // es cross-origin, así que no hay forma de saber cuándo terminó de pintar.
    // El primer `load` es lo más cerca que se puede estar: a partir de ahí el
    // iframe ya muestra algo suyo en vez de un rectángulo blanco.
    setFrameListo(true);

    if (frameLoads.current === 1) return;

    // Chrome puede bloquear el callback público → localhost después de
    // finalizar. La navegación del iframe igualmente dispara `load`, así que
    // verificamos el estado real en DocuSign y archivamos sin depender de esa
    // redirección. Es especulativo: si falla, se calla.
    void archiveCompletedSignature(false);
  }, [archiveCompletedSignature]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // El iframe de DocuSign es cross-origin: no podemos leer su ubicación.
      // La vuelta pasa por nuestra propia página de retorno, y validar el
      // origen es toda la frontera de seguridad.
      if (!isContractSigningMessage(event, window.location.origin)) return;

      const { outcome } = event.data;

      if (outcome !== 'signing_complete') {
        showToast(OUTCOME_MESSAGE[outcome], 'error');
        onClose();
        return;
      }

      // El PDF firmado no viaja con el navegador. Se le pide al API que lo
      // archive ahora mismo en vez de esperar al webhook de Connect, que
      // ademas no alcanza a un API local. El API verifica contra DocuSign que
      // el sobre sea de este cliente y que este completado.
      // Acá sí sabemos que firmó: si no se puede archivar, hay que avisar.
      void archiveCompletedSignature(true);
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [archiveCompletedSignature, onClose, showToast]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4">
        <h2 className="text-base font-medium text-neutral-800">Firma de contrato</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex size-10 cursor-pointer items-center justify-center rounded-full text-neutral-600"
        >
          <Icon icon="ion:close" className="size-6" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        {signed ? (
          <Status
            icon="ion:checkmark-circle-outline"
            tone="text-emerald-600"
            title="Listo, firmaste el contrato"
            detail={
              isArchiving
                ? 'Estamos guardando tu copia...'
                : 'Tu copia quedó guardada en tu perfil.'
            }
            action={{ label: 'Entendido', onClick: onClose }}
          />
        ) : requestError ? (
          <Status
            icon="ion:alert-circle-outline"
            tone="text-red-600"
            title="No pudimos abrir la firma"
            detail="Vuelve a intentarlo en un momento."
            action={{ label: 'Cerrar', onClick: onClose }}
          />
        ) : tardaDemasiado && !session ? (
          <Status
            icon="ion:refresh-outline"
            tone="text-neutral-500"
            title="Esto está tardando más de lo normal"
            detail="Puede ser la conexión. Volvé a intentarlo."
            action={{ label: 'Reintentar', onClick: pedirFirma }}
          />
        ) : isPending || !session ? (
          <Cargando detail="Preparando tu contrato..." />
        ) : session.mock ? (
          // Sin credenciales de DocuSign el API devuelve una url que no existe.
          // Decirlo es mejor que montar un iframe que nunca carga.
          <Status
            icon="ion:construct-outline"
            tone="text-amber-600"
            title="Firma en modo de prueba"
            detail="El servidor todavía no tiene credenciales de DocuSign, así que no hay documento que firmar."
            action={{ label: 'Cerrar', onClick: onClose }}
          />
        ) : (
          // El iframe se monta a tamaño completo desde el principio —DocuSign
          // necesita medidas reales para maquetar— y el loader va encima hasta
          // que carga. Ocultarlo con `hidden` o un tamaño de un píxel le
          // rompería el layout al documento.
          <div className="relative size-full">
            <iframe
              src={session.url}
              title="Firma de contrato"
              className={`size-full border-0 ${frameListo ? '' : 'opacity-0'}`}
              onLoad={handleFrameLoad}
              // El flujo de firma necesita su propio contexto de navegación para
              // la redirección de retorno.
              sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation-by-user-activation"
            />
            {!frameListo && (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <Cargando detail="Abriendo tu contrato..." />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Cargando({ detail }: { detail: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-8 text-center">
      <Icon icon="ion:sync-outline" className="size-8 animate-spin text-neutral-400" />
      <p className="text-base text-neutral-400">{detail}</p>
    </div>
  );
}

interface StatusProps {
  icon: string;
  tone: string;
  title: string;
  detail: string;
  action: { label: string; onClick: () => void };
}

function Status({ icon, tone, title, detail, action }: StatusProps) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-8 text-center">
      <Icon icon={icon} className={`size-12 ${tone}`} />
      <p className="text-lg font-medium text-neutral-800">{title}</p>
      <p className="text-base text-neutral-500">{detail}</p>
      <button
        type="button"
        onClick={action.onClick}
        className="mt-2 flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl border border-neutral-300 text-base font-medium text-neutral-700"
      >
        {action.label}
      </button>
    </div>
  );
}
