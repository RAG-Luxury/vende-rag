'use client';

import { Info } from 'lucide-react';

import { TopNav } from '@/src/shared/ui/top-nav';
// Reuses the same header/footer the main landing page uses; no shared
// cross-feature abstraction exists yet for this composition (same precedent
// as products-screen.tsx's own imports of LandingFooter/TopNavActions).
// eslint-disable-next-line boundaries/element-types
import { useCurrentUser } from '@/src/features/auth/presentation/hooks/use-current-user';
// eslint-disable-next-line boundaries/element-types
import { TopNavActions } from '@/src/features/auth/presentation/components/top-nav-actions';
// eslint-disable-next-line boundaries/element-types
import { LandingHeader } from '@/src/features/auth/presentation/components/landing-header';
// eslint-disable-next-line boundaries/element-types
import { LandingNewProducts } from '@/src/features/auth/presentation/components/landing-new-products';
// eslint-disable-next-line boundaries/element-types
import { LandingFooter } from '@/src/features/auth/presentation/components/landing-footer';
// eslint-disable-next-line boundaries/element-types
import { LoginModalProvider } from '@/src/features/auth/presentation/login-modal-context';
import { useDesigners } from '../hooks/use-designers';

export function DesignersScreen() {
  const user = useCurrentUser();
  const { data, isPending, isError, refetch } = useDesigners();

  const designers = data ?? [];

  return (
    <LoginModalProvider>
      <div className="flex min-h-full flex-col bg-white">
        {user ? <TopNav trailing={<TopNavActions />} /> : <LandingHeader />}

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 md:px-8 md:py-20">
          <h1 className="font-editors text-center text-2xl text-neutral-900 md:text-5xl">
            Directorio de Diseñadores
          </h1>

          <div className="mt-12 md:mt-16">
            {isPending ? (
              <p className="text-center text-sm text-neutral-400">Cargando diseñadores…</p>
            ) : isError ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-center text-sm text-neutral-500">
                  No pudimos cargar el catálogo de diseñadores.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="text-brand text-sm font-medium underline"
                >
                  Reintentar
                </button>
              </div>
            ) : designers.length === 0 ? (
              <p className="text-center text-sm text-neutral-500">
                Aún no hay diseñadores disponibles.
              </p>
            ) : (
              <ul className="columns-1 gap-8 sm:columns-2 lg:columns-3">
                {designers.map((designer) => (
                  <li
                    key={designer.id}
                    className={`break-inside-avoid py-3 text-center ${
                      designer.available ? 'text-neutral-700' : 'text-neutral-400'
                    }`}
                  >
                    {designer.available ? (
                      designer.name
                    ) : (
                      /* El directorio es informativo: aqui no se elige nada,
                         asi que la marca suspendida se atenua y se explica en
                         vez de desaparecer. Quien busca la suya la encuentra
                         y entiende por que no puede subirla todavia. */
                      <>
                        <span className="inline-flex items-center gap-1.5">
                          {designer.name}
                        </span>
                        {designer.unavailableReason ? (
                          <span className="mt-0.5 block text-[10px] text-neutral-400">
                            {designer.unavailableReason}
                          </span>
                        ) : null}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>

        <LandingNewProducts />
        <LandingFooter isAuthenticated={Boolean(user)} />
      </div>
    </LoginModalProvider>
  );
}
