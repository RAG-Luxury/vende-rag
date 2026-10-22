'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import { resolvePayment } from '@/src/features/product-views/domain/payment-status';
import type {
  Product,
  ProductView,
} from '@/src/features/product-views/domain/product-view-repository';
import { AccountTabs } from '@/src/shared/ui/account-tabs';
import { BottomNav } from '@/src/shared/ui/bottom-nav';
// The desktop welcome heading needs the account profile's trimmed display name;
// no shared cross-feature abstraction exists yet for this read (same precedent
// as top-nav-actions.tsx, which reads this same hook for its own display name).
// eslint-disable-next-line boundaries/element-types
import { useProfileSummary } from '@/src/features/account/presentation/hooks/use-profile-summary';
// Reused as-is below the desktop product grid (same section LandingScreen and
// profile-screen.tsx render at the bottom of their desktop views); no shared
// cross-feature abstraction exists yet for this read (same precedent as
// profile-screen.tsx's own import of LandingFooter).
// eslint-disable-next-line boundaries/element-types
import { LandingFooter } from '@/src/features/auth/presentation/components/landing-footer';
import { useProducts } from '../hooks/use-products';
import { usePaidByProduct } from '../hooks/use-paid-by-product';
import { VIEW_CONFIG, type CurrencyAmount } from '../view-config';
import { ProductCard } from './product-card';
import { ProductSummary, type SummaryItem } from './product-summary';
import { ShippingOptionsModal } from './shipping-options-modal';

type SortOrder = 'price-desc' | 'price-asc' | 'oldest' | 'newest';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

function sortProducts(list: readonly Product[], order: SortOrder | null): Product[] {
  if (order === null) return [...list];
  return [...list].sort((a, b) => {
    if (order === 'price-desc') return b.salePrice - a.salePrice;
    if (order === 'price-asc') return a.salePrice - b.salePrice;
    if (order === 'oldest') return a.id - b.id;
    return b.id - a.id;
  });
}

function amountFor(
  product: Product,
  amount: CurrencyAmount,
  paidById: ReadonlyMap<number, number>,
): number {
  if (amount === 'paid' || amount === 'pending') {
    const itemizedPaid = paidById.get(product.id) ?? 0;
    const resolved = resolvePayment(product.status, product.earning, itemizedPaid);
    return amount === 'paid' ? resolved.paid : resolved.pending;
  }
  if (amount === 'salePrice') return product.finalPrice;
  return product.earning;
}

function ventasSecondary(product: Product, paidById: ReadonlyMap<number, number>) {
  const itemizedPaid = paidById.get(product.id) ?? 0;
  const resolved = resolvePayment(product.status, product.earning, itemizedPaid);
  return resolved.isPaid
    ? { label: 'Pagado', value: resolved.paid }
    : { label: 'Por pagar', value: resolved.pending };
}

interface ProductsScreenProps {
  view: ProductView;
  clientId: number | null;
}

export function ProductsScreen({ view, clientId }: ProductsScreenProps) {
  const router = useRouter();
  const config = VIEW_CONFIG[view];
  const { data: profileSummary } = useProfileSummary(clientId);

  const [sortOrder, setSortOrder] = useState<SortOrder | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [checkedStatuses, setCheckedStatuses] = useState<ReadonlySet<number>>(new Set());
  const [mobileSortMenuOpen, setMobileSortMenuOpen] = useState(false);
  const [desktopSortMenuOpen, setDesktopSortMenuOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const mobileSortMenuRef = useRef<HTMLDivElement>(null);
  const desktopSortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileSortMenuOpen && !desktopSortMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isOutsideMobile = !mobileSortMenuRef.current?.contains(target);
      const isOutsideDesktop = !desktopSortMenuRef.current?.contains(target);

      if (mobileSortMenuOpen && isOutsideMobile) {
        setMobileSortMenuOpen(false);
      }

      if (desktopSortMenuOpen && isOutsideDesktop) {
        setDesktopSortMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileSortMenuOpen, desktopSortMenuOpen]);

  function handleSortSelect(order: SortOrder) {
    setSortOrder(order);
    setMobileSortMenuOpen(false);
    setDesktopSortMenuOpen(false);
  }

  const { data: products, isLoading, isError } = useProducts(view, clientId, '');

  // Sin id de seller la consulta ni siquiera corre, asi que el resultado vacio
  // no significa que no tenga productos: significa que no sabemos por quien
  // preguntar.
  const sessionIncomplete = clientId === null;

  useEffect(() => {
    if (view !== 'solicitudes') return;
    if (!products) return;

    const isPreaprobado = config.summary.find((item) => item.label === 'Preaprobado')?.matches;
    if (!isPreaprobado) return;

    const preaprobadoIds = products.filter(isPreaprobado).map((product) => product.id);
    if (preaprobadoIds.length === 0) return;

    const STORAGE_KEY = 'rag_shipping_modal_seen_ids';
    const seenIds: number[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    const hasNewPreaprobado = preaprobadoIds.some((id) => !seenIds.includes(id));
    if (!hasNewPreaprobado) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set([...seenIds, ...preaprobadoIds])]));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsShippingModalOpen(true);
  }, [view, products, config]);

  const productIds = useMemo(() => (products ?? []).map((product) => product.id), [products]);
  const needsPayments = view === 'ventas';
  const paidById = usePaidByProduct(productIds, needsPayments);
  const sortLabel =
    sortOrder === 'price-desc'
      ? 'Precio: mayor a menor'
      : sortOrder === 'price-asc'
        ? 'Precio: menor a mayor'
        : sortOrder === 'oldest'
          ? 'Más antigua'
          : sortOrder === 'newest'
            ? 'Más reciente'
            : 'Ordenar por';

  const summary = useMemo<readonly SummaryItem[]>(() => {
    const list = products ?? [];
    return config.summary.map((item) => {
      const matches = list.filter(item.matches);
      return {
        label: item.label,
        icon: item.icon,
        format: item.format,
        value:
          item.format === 'currency'
            ? matches.reduce(
                (total, product) => total + amountFor(product, item.amount ?? 'earning', paidById),
                0,
              )
            : matches.length,
        ...(item.format === 'currency' ? { count: matches.length } : {}),
      };
    });
  }, [products, config, paidById]);

  // Mobile keeps the original tap-to-toggle single-select chip behavior.
  const mobileVisibleProducts = useMemo(() => {
    const predicate = selectedIndex === null ? null : config.summary[selectedIndex]?.matches;
    const filtered = (products ?? []).filter((product) => !predicate || predicate(product));
    return sortProducts(filtered, sortOrder);
  }, [products, sortOrder, selectedIndex, config]);

  // Desktop sidebar checkboxes are naturally multi-select: with none checked
  // show everything, otherwise OR-match against every checked status.
  const desktopVisibleProducts = useMemo(() => {
    const activeMatchers = config.summary
      .filter((_, index) => checkedStatuses.has(index))
      .map((item) => item.matches);
    const filtered = (products ?? []).filter(
      (product) =>
        activeMatchers.length === 0 || activeMatchers.some((matches) => matches(product)),
    );
    return sortProducts(filtered, sortOrder);
  }, [products, sortOrder, checkedStatuses, config]);

  function handleSummarySelect(index: number) {
    setSelectedIndex((current) => (current === index ? null : index));
  }

  function handleStatusToggle(index: number) {
    setCheckedStatuses((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function renderCard(product: Product) {
    return (
      <Link
        key={product.id}
        href={`/productos/${product.id}?view=${view}`}
        className="block h-full"
      >
        <ProductCard
          product={product}
          isSale={view === 'ventas'}
          isPublication={view === 'publicaciones'}
          secondary={
            view === 'ventas'
              ? ventasSecondary(product, paidById)
              : {
                  label: config.cardSecondary.label,
                  value: amountFor(product, config.cardSecondary.amount, paidById),
                }
          }
        />
      </Link>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col md:mx-0 md:max-w-none">
      <div className="flex flex-1 flex-col md:hidden">
        <header className="relative flex items-center justify-center px-6 pt-6">
          <button
            type="button"
            onClick={() => (config.backHref ? router.push(config.backHref) : router.back())}
            aria-label="Volver"
            className="absolute left-6 text-neutral-900"
          >
            <Icon icon="ion:chevron-back-outline" className="size-7" />
          </button>
          <h1 className="text-lg font-semibold text-neutral-900">{config.title}</h1>
        </header>

        <div className="flex-1 px-6 pt-6 pb-28">
          <div className="flex flex-wrap items-center justify-center gap-3 py-2">
            <div className="w-fit">
              <ProductSummary
                items={summary}
                selectedIndex={selectedIndex}
                onSelect={handleSummarySelect}
              />
            </div>

            <div ref={mobileSortMenuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMobileSortMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm"
              >
                {sortLabel}
                <Icon icon="ion:funnel-outline" className="size-4" />
              </button>

              {mobileSortMenuOpen ? (
                <div className="absolute right-0 z-10 mt-2 w-40 rounded-2xl border border-neutral-200 bg-white py-2 shadow-lg">
                  {[
                    { value: 'price-desc', label: 'Precio: mayor a menor' },
                    { value: 'price-asc', label: 'Precio: menor a mayor' },
                    { value: 'oldest', label: 'Más antigua' },
                    { value: 'newest', label: 'Más reciente' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSortSelect(option.value as SortOrder)}
                      className={`block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 ${sortOrder === option.value ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            {isLoading ? (
              <p className="py-12 text-center text-sm text-neutral-400">Cargando...</p>
            ) : sessionIncomplete ? (
              <p className="py-12 text-center text-sm text-red-600">
                No pudimos identificar tu sesión. Vuelve a iniciar sesión.
              </p>
            ) : isError ? (
              <p className="py-12 text-center text-sm text-red-600">
                No pudimos cargar la información. Inténtalo de nuevo.
              </p>
            ) : mobileVisibleProducts.length === 0 ? (
              <p className="py-12 text-center text-sm text-neutral-400">{config.emptyText}</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,192px)] justify-center gap-6">
                {mobileVisibleProducts.map(renderCard)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hidden flex-1 flex-col md:flex">
        <div className="px-8 py-10">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
            <h1 className="font-editors text-2xl text-neutral-900">
              ¡Hola!, bienvenid@{' '}
              {profileSummary ? (
                <span className="italic">
                  {profileSummary.firstName} {profileSummary.lastName}
                </span>
              ) : null}
            </h1>

            <div className="mt-8">
              <AccountTabs />
            </div>

            <div className="mt-8 flex flex-1">
              <aside className="w-56 shrink-0">
                <h2 className="font-editors text-2xl text-neutral-900">Mis {config.title}</h2>

                <p className="mt-8 text-xs font-semibold tracking-[0.2em] text-neutral-400 uppercase">
                  Estatus
                </p>

                <div className="mt-3 grid grid-cols-[max-content_min-content] items-center gap-x-3 gap-y-3">
                  {summary.map((item, index) => {
                    const checked = checkedStatuses.has(index);
                    const display =
                      item.format === 'currency'
                        ? currencyFormatter.format(item.value)
                        : String(item.value);

                    return (
                      <label
                        key={item.label}
                        className="contents cursor-pointer text-sm text-neutral-700"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleStatusToggle(index)}
                            className="accent-brand size-4 rounded border-neutral-300"
                          />
                          {item.label}
                        </span>
                        <span className="text-center text-xs text-neutral-400">{display}</span>
                      </label>
                    );
                  })}
                </div>
              </aside>

              <div className="min-w-0 flex-1">
                <div className="mb-4 flex w-[90%] justify-end">
                  <div ref={desktopSortMenuRef} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setDesktopSortMenuOpen((open) => !open)}
                      aria-label="Ordenar por"
                      aria-expanded={desktopSortMenuOpen}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-neutral-400 bg-white text-neutral-500 transition-all duration-300 ease-out hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
                    >
                      <Icon icon="ion:funnel-outline" className="size-4" />
                    </button>

                    {desktopSortMenuOpen ? (
                      <div className="absolute top-full right-0 z-10 mt-2 w-40 rounded-2xl border border-neutral-200 bg-white py-2 shadow-lg">
                        {[
                          { value: 'price-desc', label: 'Precio: mayor a menor' },
                          { value: 'price-asc', label: 'Precio: menor a mayor' },
                          { value: 'oldest', label: 'Más antigua' },
                          { value: 'newest', label: 'Más reciente' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSortSelect(option.value as SortOrder)}
                            className={`block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-neutral-50 ${sortOrder === option.value ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {isLoading ? (
                  <p className="py-12 text-center text-sm text-neutral-400">Cargando...</p>
                ) : sessionIncomplete ? (
                  <p className="py-12 text-center text-sm text-red-600">
                    No pudimos identificar tu sesión. Vuelve a iniciar sesión.
                  </p>
                ) : isError ? (
                  <p className="py-12 text-center text-sm text-red-600">
                    No pudimos cargar la información. Inténtalo de nuevo.
                  </p>
                ) : desktopVisibleProducts.length === 0 ? (
                  <p className="py-12 text-center text-sm text-neutral-400">{config.emptyText}</p>
                ) : (
                  <div className="grid grid-cols-[repeat(4,192px)] gap-6">
                    {desktopVisibleProducts.map(renderCard)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <LandingFooter isAuthenticated />
      </div>

      <BottomNav />
      {isShippingModalOpen ? (
        <ShippingOptionsModal onClose={() => setIsShippingModalOpen(false)} />
      ) : null}
    </div>
  );
}
