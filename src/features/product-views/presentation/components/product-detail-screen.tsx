'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';

import { ConfirmDialog } from '@/src/shared/ui/confirm-dialog';
import { useToast } from '@/src/shared/ui/toast';

import { resolvePayment } from '@/src/features/product-views/domain/payment-status';
import type { SellerPayment } from '@/src/features/product-views/domain/product-view-repository';
import {
  isPublicationApproved,
  isPublicationProgress,
  resolvePublicationPillLabel,
} from '@/src/features/product-views/domain/publication-status';
// Reused as-is below the desktop product detail (same section LandingScreen and
// profile-screen.tsx render at the bottom of their desktop views); no shared
// cross-feature abstraction exists yet for this read (same precedent as
// profile-screen.tsx's own import of LandingFooter).
// eslint-disable-next-line boundaries/element-types
import { LandingFooter } from '@/src/features/auth/presentation/components/landing-footer';
import { useCommission } from '../hooks/use-commission';
import { useProductDetail } from '../hooks/use-product-detail';
import { useProductPrice } from '../hooks/use-product-price';
import { useRemoveDiscount } from '../hooks/use-remove-discount';
import { useRespondNegotiation } from '../hooks/use-respond-negotiation';
import { useSellerPayments } from '../hooks/use-seller-payments';
import type { DiscountType } from '@/src/features/product-views/domain/product-view-repository';
import { ApplyDiscountModal } from './apply-discount-modal';
import { ProductGallery } from './product-gallery';
import { getStatusStyle } from './product-status';
// Temporarily swapped for PublicationGenerationLoaderBar below — restore this
// import once the ring-based checklist design is brought back.
// import { PublicationGenerationChecklist } from './publication-generation-checklist';
// Temporarily hidden per user request — uncomment to bring the progress
// bars back.
// import { PublicationGenerationLoaderBar } from './publication-generation-loader-bar';
import { PublicationTimeline } from './publication-timeline';

const NEGOTIATION_STATE = 2;

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

interface ProductDetailScreenProps {
  productId: number;
  view?: string;
}

export function ProductDetailScreen({ productId, view }: ProductDetailScreenProps) {
  const router = useRouter();
  const isSale = view === 'ventas';
  const [openSection, setOpenSection] = useState<'info' | 'detail' | null>(null);
  const infoOpen = openSection === 'info';
  const detailOpen = openSection === 'detail';
  const [discountModalOpen, setDiscountModalOpen] = useState(false);

  function toggleSection(section: 'info' | 'detail') {
    setOpenSection((current) => (current === section ? null : section));
  }
  const { data: product, isLoading, isError } = useProductDetail(productId);
  const isNegotiation = product?.statusCode === NEGOTIATION_STATE;
  const respondNegotiation = useRespondNegotiation();
  const discountAmount = isNegotiation ? 0 : (product?.discountAmount ?? 0);
  const finalPrice = isNegotiation ? 0 : (product?.finalPrice ?? 0);
  // The stored price is read from the API because that is the only place the
  // per-product commission rules are applied; the commission endpoint only
  // knows price and client, so it is kept for the negotiation what-if, where
  // there is no stored price to read yet.
  const { data: price } = useProductPrice(productId, product !== undefined && !isNegotiation);
  const negotiationPrice = product?.negotiationPrice ?? 0;
  const { data: commission } = useCommission(
    negotiationPrice,
    product?.clientId ?? 0,
    product !== undefined && isNegotiation && negotiationPrice > 0,
  );
  const { data: payments } = useSellerPayments(productId, isSale);

  const commissionAmount =
    (isNegotiation ? commission?.amount : price?.commissionAmount) ?? product?.commission ?? 0;
  const earning =
    (isNegotiation
      ? (commission?.sellerNet ?? product?.negotiationPrice)
      : (price?.sellerPrice ?? product?.earning)) ?? 0;
  const itemizedPaid = (payments ?? []).reduce((total, payment) => total + payment.amount, 0);
  const { isPaid, paid, pending } = resolvePayment(product?.status ?? '', earning, itemizedPaid);
  const inPublicationProgress = isPublicationProgress(product?.statusCode ?? 0);
  const pillStatus = inPublicationProgress
    ? resolvePublicationPillLabel(product?.statusCode ?? 0)
    : (product?.status ?? '');
  const isPreaprobada = pillStatus.trim().toLowerCase() === 'preaprobado';
  const showDiscountButton =
    view === 'publicaciones' &&
    product?.status.trim().toLowerCase() === 'activo' &&
    (product?.discountAmount ?? 0) <= 0 &&
    (product?.discountPercent ?? 0) <= 0;
  const existingDiscountType: DiscountType | null =
    (product?.discountPercent ?? 0) > 0
      ? 'percentage'
      : (product?.discountAmount ?? 0) > 0
        ? 'fixed'
        : null;
  const existingDiscountValue =
    existingDiscountType === 'percentage'
      ? (product?.discountPercent ?? 0)
      : existingDiscountType === 'fixed'
        ? (product?.discountAmount ?? 0)
        : 0;

  const { showToast } = useToast();
  const removeDiscount = useRemoveDiscount();
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  function handleRemoveDiscount() {
    if (removeDiscount.isPending) return;
    removeDiscount.mutate(productId, {
      onSuccess: () => {
        setConfirmRemoveOpen(false);
        showToast('Descuento eliminado correctamente');
      },
      onError: () => showToast('No se pudo eliminar el descuento. Intenta de nuevo.', 'error'),
    });
  }

  // Ícono de borrar junto al label "Descuento", visible solo en publicaciones activas.
  const removeDiscountAction: ReactNode = showDiscountButton ? (
    <button
      type="button"
      aria-label="Quitar descuento"
      onClick={() => setConfirmRemoveOpen(true)}
      disabled={removeDiscount.isPending}
      className="hidden text-red-600 transition-colors hover:cursor-pointer hover:text-red-700 disabled:opacity-50"
    >
      <Icon icon="ion:trash-outline" className="size-4" />
    </button>
  ) : null;

  function handleApprove() {
    if (!product) return;
    respondNegotiation.mutate(
      {
        productId,
        decision: {
          action: 'aprobar',
          approvePrice: product.negotiationPrice,
          comment: 'De acuerdo',
        },
      },
      { onSuccess: () => router.back() },
    );
  }

  function handleReject() {
    respondNegotiation.mutate(
      { productId, decision: { action: 'rechazar', comment: 'El precio es muy bajo' } },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col md:max-w-none">
      <header className="relative flex w-full items-center justify-center px-6 py-4 md:mx-auto md:max-w-7xl md:pt-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-6 mb-[25px] flex cursor-pointer items-center gap-1.5 text-neutral-900"
        >
          <Icon icon="ion:chevron-back-outline" className="size-7" />
          <span className="hidden text-sm font-medium md:inline">Regresar</span>
        </button>
      </header>

      <div className="flex-1 pb-10 md:flex md:min-h-0 md:flex-col md:justify-center md:pb-0">
        {isLoading ? (
          <p className="py-12 text-center text-sm text-neutral-400">Cargando producto...</p>
        ) : isError || !product ? (
          <p className="py-12 text-center text-sm text-red-600">
            No pudimos cargar el producto. Inténtalo de nuevo.
          </p>
        ) : (
          <>
            <div className="md:hidden">
              <div className="md:sticky md:top-6">
                <ProductGallery images={product.images} alt={product.name} />
              </div>

              <div className="md:min-w-0">
                <div className="flex items-start justify-between gap-4 px-6 pt-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-neutral-900">{product.name}</h2>
                    <p className="text-sm text-neutral-400">
                      #{product.id}
                      {isSale && product.initialStatus ? ` / ${product.initialStatus}` : ''}
                    </p>
                    {isSale && product.soldDate ? (
                      <p className="text-xs text-neutral-400">Fecha de venta: {product.soldDate}</p>
                    ) : null}
                  </div>
                  {pillStatus ? (
                    <span
                      className="shrink-0 rounded-full px-5 text-sm font-medium"
                      style={{
                        ...getStatusStyle(pillStatus),
                        paddingTop: '2.5px',
                        paddingBottom: '2.5px',
                      }}
                    >
                      {pillStatus}
                    </span>
                  ) : null}
                </div>

                {view === 'publicaciones' && isPublicationProgress(product.statusCode) ? (
                  <div className="mt-4 px-6">
                    {isPublicationApproved(product.statusCode) ? (
                      <>
                        {/* Temporarily swapped for PublicationGenerationLoaderBar — restore this
                            ring-based design by uncommenting it (and the import above) and
                            removing the loader bar below.
                        <PublicationGenerationChecklist
                          infoGenerated={isPublicationInfoGenerated(product.statusCode)}
                          hasVideo={product.hasVideo}
                          hasPhotos={product.hasPhotos}
                          hasTag={product.hasTag}
                        />
                        */}
                        {/* Temporarily hidden per user request — uncomment to bring the progress
                            bars back.
                        <PublicationGenerationLoaderBar
                          infoGenerated={isPublicationInfoGenerated(product.statusCode)}
                          hasVideo={product.hasVideo}
                          hasPhotos={product.hasPhotos}
                          hasTag={product.hasTag}
                        />
                        */}
                        {product.estimatedActivationDate ? (
                          <p className="mt-4 text-xs text-neutral-400">
                            Fecha estimada de activación:{' '}
                            <span className="font-medium text-neutral-600">
                              {new Date(product.estimatedActivationDate).toLocaleDateString(
                                'es-MX',
                                {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                },
                              )}
                            </span>
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <PublicationTimeline
                          statusCode={product.statusCode}
                          isAuthenticated={product.isAuthenticated}
                        />
                        {isPreaprobada ? (
                          <p className="mt-4 flex items-center gap-1.5 text-xs text-neutral-400">
                            {product.receivedDate
                              ? `Recibido el ${dateFormatter.format(new Date(product.receivedDate))}`
                              : 'Recibido en tienda'}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}

                <section className="mt-6 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => toggleSection('info')}
                    aria-expanded={infoOpen}
                    className="flex w-full items-center justify-between px-6 py-5"
                  >
                    <span className="text-sm font-semibold text-neutral-900">
                      Información del Producto
                    </span>
                    <Icon
                      icon="ion:chevron-down-outline"
                      className={`size-5 text-neutral-500 transition-transform ${infoOpen ? 'rotate-180' : ''
                        }`}
                    />
                  </button>

                  {infoOpen ? (
                    <dl className="px-6 pb-5">
                      <InfoRow label="Marca" value={product.brand} />
                      <InfoRow label="Modelo" value={product.model} />
                      <InfoRow label="Departamento" value={product.department} />
                      <InfoRow label="Categoría" value={product.category} />
                      <InfoRow label="Subcategoría" value={product.subcategory} />
                      <InfoRow label="Color" value={product.color} />
                    </dl>
                  ) : null}
                </section>

                {product.detail ? (
                  <section className="border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={() => toggleSection('detail')}
                      aria-expanded={detailOpen}
                      className="flex w-full items-center justify-between px-6 py-5"
                    >
                      <span className="text-sm font-semibold text-neutral-900">
                        Detalles del Producto
                      </span>
                      <Icon
                        icon="ion:chevron-down-outline"
                        className={`size-5 text-neutral-500 transition-transform ${detailOpen ? 'rotate-180' : ''
                          }`}
                      />
                    </button>
                    {detailOpen ? (
                      <p className="px-6 pb-5 text-sm text-neutral-400">{product.detail}</p>
                    ) : null}
                  </section>
                ) : null}

                <section className="border-t border-neutral-200 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      {isNegotiation ? 'Negociación' : 'Desglose de Precio'}
                    </h3>
                    {showDiscountButton ? (
                      <button
                        type="button"
                        onClick={() => setDiscountModalOpen(true)}
                        className="text-brand flex cursor-pointer items-center gap-1 text-xs font-medium"
                      >
                        <Icon icon="ion:pricetag-outline" className="size-4" />
                        Agregar descuento
                      </button>
                    ) : null}
                  </div>
                  <dl className="mt-4 space-y-3">
                    <PriceRow
                      label={resolvePriceLabel({ isNegotiation, isSale, discountAmount })}
                      value={currencyFormatter.format(
                        isNegotiation ? product.negotiationPrice : product.salePrice,
                      )}
                    />
                    {discountAmount > 0 ? (
                      <>
                        <PriceRow
                          negative
                          label="Descuento"
                          labelAction={removeDiscountAction}
                          value={currencyFormatter.format(discountAmount)}
                        />
                        <PriceRow
                          bold
                          label="Precio Final"
                          value={currencyFormatter.format(finalPrice)}
                        />
                      </>
                    ) : null}
                    <PriceRow
                      negative
                      label="Comisión RAG"
                      value={currencyFormatter.format(commissionAmount)}
                    />
                    <div className="grid grid-cols-[4fr_3fr] items-center gap-x-8 pt-1">
                      <dt className="text-sm font-semibold text-neutral-900">Tu Ganancia</dt>
                      <dd className="text-sm font-semibold text-neutral-900">
                        {currencyFormatter.format(earning)}
                      </dd>
                    </div>
                    {isSale && product.initialStatus === 'Apartado' && !isPaid ? (
                      <>
                        <div className="grid grid-cols-[4fr_3fr] items-center gap-x-8">
                          <dt className="text-sm text-neutral-500">Anticipo (30%)</dt>
                          <dd className="text-sm text-neutral-400">
                            {currencyFormatter.format(pending * 0.3)}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[4fr_3fr] items-center gap-x-8">
                          <dt className="text-sm text-neutral-500">Liquidación (70%)</dt>
                          <dd className="text-sm text-neutral-400">
                            {currencyFormatter.format(pending * 0.7)}
                          </dd>
                        </div>
                      </>
                    ) : isSale ? (
                      <div className="grid grid-cols-[4fr_3fr] items-center gap-x-8">
                        <dt className="text-sm text-neutral-500">
                          {isPaid ? 'Pagado' : 'Por pagar'}
                        </dt>
                        <dd className="text-sm text-neutral-400">
                          {currencyFormatter.format(isPaid ? paid : pending)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </section>

                {isNegotiation ? (
                  <div className="flex gap-4 px-6 py-5">
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={respondNegotiation.isPending}
                      className="flex-1 rounded-full bg-neutral-200 py-4 text-sm font-medium text-neutral-900 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={respondNegotiation.isPending}
                      className="bg-brand flex-1 rounded-full py-3 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Aceptar
                    </button>
                  </div>
                ) : null}

                {isSale ? (
                  <section className="border-t border-neutral-200 px-6 py-5">
                    <h3 className="text-sm font-semibold text-neutral-900">Historial de Pagos</h3>
                    {payments && payments.length > 0 ? (
                      <ul className="mt-4 space-y-3">
                        {payments.map((payment) => (
                          <PaymentRow key={payment.id} payment={payment} />
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 text-sm text-neutral-400">Sin pagos registrados.</p>
                    )}
                  </section>
                ) : null}
              </div>
            </div>

            <div className="hidden w-full items-stretch justify-center gap-8 px-8 pb-8 md:mx-auto md:flex md:max-w-7xl">
              <div className="w-2/5 shrink-0 overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-100">
                <ProductGallery images={product.images} alt={product.name} fill />
              </div>

              <div className="scrollbar-hide flex min-w-0 flex-1 flex-col rounded-3xl border border-neutral-200 p-5 md:max-w-[calc(57%-250px)]">
                <div className="items-start gap-6">
                  <div className="min-w-0">
                    <div className="flex w-[100%] items-center justify-between">
                      <p className="text-sm font-semibold tracking-wide text-neutral-400 uppercase">
                        #{product.id}
                        {isSale && product.initialStatus ? (
                          <span className="normal-case"> / {product.initialStatus}</span>
                        ) : (
                          ''
                        )}
                      </p>
                      {pillStatus ? (
                        <span
                          className="shrink-0 rounded-full px-5 text-sm font-medium"
                          style={{
                            ...getStatusStyle(pillStatus),
                            paddingTop: '2.5px',
                            paddingBottom: '2.5px',
                          }}
                        >
                          {pillStatus}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-2 text-[18px] font-semibold text-neutral-900">
                      {product.name}
                    </h2>
                    {isSale && product.soldDate ? (
                      <p className="text-xs text-neutral-400">Fecha de venta: {product.soldDate}</p>
                    ) : null}
                  </div>
                </div>

                {view === 'publicaciones' && isPublicationProgress(product.statusCode) ? (
                  <div className="mt-6">
                    {isPublicationApproved(product.statusCode) ? (
                      <>
                        {/* Temporarily swapped for PublicationGenerationLoaderBar — restore this
                            ring-based design by uncommenting it (and the import above) and
                            removing the loader bar below.
                        <PublicationGenerationChecklist
                          infoGenerated={isPublicationInfoGenerated(product.statusCode)}
                          hasVideo={product.hasVideo}
                          hasPhotos={product.hasPhotos}
                          hasTag={product.hasTag}
                        />
                        */}
                        {/* Temporarily hidden per user request — uncomment to bring the progress
                            bars back.
                        <PublicationGenerationLoaderBar
                          infoGenerated={isPublicationInfoGenerated(product.statusCode)}
                          hasVideo={product.hasVideo}
                          hasPhotos={product.hasPhotos}
                          hasTag={product.hasTag}
                        />
                        */}
                        {/*product.estimatedActivationDate ? (
                          <p className="mt-4 text-xs text-neutral-400">
                            Fecha estimada de activación:{' '}
                            <span className="font-medium text-neutral-600">
                              {new Date(product.estimatedActivationDate).toLocaleDateString(
                                'es-MX',
                                {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                },
                              )}
                            </span>
                          </p> 
                        ) : null*/}
                      </>
                    ) : (
                      <>
                        <PublicationTimeline
                          statusCode={product.statusCode}
                          isAuthenticated={product.isAuthenticated}
                        />
                        {isPreaprobada ? (
                          <p className="mt-4 flex items-center gap-1.5 text-xs text-neutral-400">
                            <Icon icon="mdi:truck-outline" className="size-4 shrink-0" />
                            {product.receivedDate
                              ? `Recibido el ${dateFormatter.format(new Date(product.receivedDate))}`
                              : 'Recibido en tienda'}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col border-t border-neutral-200">
                  <section>
                    {isSale ? (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleSection('info')}
                          aria-expanded={infoOpen}
                          className="flex w-full items-center justify-between py-5"
                        >
                          <span className="text-xs font-semibold text-neutral-900">
                            Información del Producto
                          </span>
                          <Icon
                            icon="ion:chevron-down-outline"
                            className={`size-5 text-neutral-500 transition-transform ${infoOpen ? 'rotate-180' : ''
                              }`}
                          />
                        </button>
                        {infoOpen ? (
                          <div className="mb-5 flex justify-evenly">
                            <div className="text-center">
                              <DetailField label="Marca" value={product.brand} />
                              <DetailField label="Modelo" value={product.model} />
                              <DetailField label="Departamento" value={product.department} />
                            </div>

                            <div className="text-center">
                              <DetailField label="Categoría" value={product.category} />
                              <DetailField label="Subcategoría" value={product.subcategory} />
                              <DetailField label="Color" value={product.color} />
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <h3 className="w-full py-5 text-[14px] font-semibold text-neutral-900">
                          Información del Producto
                        </h3>
                        <div className="mr-5 mb-5 flex justify-evenly">
                          <div className="grid w-full max-w-[574px] grid-cols-[4fr_3fr] gap-x-8">
                            <div className="text-left">
                              <DetailField label="Marca" value={product.brand} />
                              <DetailField label="Modelo" value={product.model} />
                              <DetailField label="Departamento" value={product.department} />
                            </div>

                            <div className="text-left">
                              <DetailField label="Categoría" value={product.category} />
                              <DetailField label="Subcategoría" value={product.subcategory} />
                              <DetailField label="Color" value={product.color} />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </section>

                  {product.detail ? (
                    <section className="border-t border-neutral-200">
                      <button
                        type="button"
                        onClick={() => toggleSection('detail')}
                        aria-expanded={detailOpen}
                        className="flex w-full items-center justify-between py-5"
                      >
                        <span className="text-[14px] font-semibold text-neutral-900">
                          Detalles del Producto
                        </span>
                        <Icon
                          icon="ion:chevron-down-outline"
                          className={`size-5 text-neutral-500 transition-transform ${detailOpen ? 'rotate-180' : ''
                            }`}
                        />
                      </button>
                      {detailOpen ? (
                        <p className="pb-6 text-[12px] text-neutral-500">{product.detail}</p>
                      ) : null}
                    </section>
                  ) : null}
                </div>

                <div className="border-t border-neutral-200 pt-6">
                  <h3 className="text-[14px] font-semibold text-neutral-900">
                    {isNegotiation ? 'Negociación' : 'Desglose de Precio'}
                  </h3>

                  <div className="mr-5 mt-4 flex justify-evenly">
                    <div className="relative grid w-full max-w-[574px] grid-cols-[4fr_3fr] gap-x-8">
                      {showDiscountButton ? (
                        <button
                          type="button"
                          onClick={() => setDiscountModalOpen(true)}
                          className="text-brand absolute -top-9 left-0 col-start-2 cursor-pointer text-xs font-medium"
                        >
                          <Icon
                            icon="ion:pricetag-outline"
                            className="absolute top-1/2 -left-5 size-4 -translate-y-1/2"
                          />
                          Agregar descuento
                        </button>
                      ) : null}
                      <dl className="col-span-2 space-y-3">
                        <PriceRow
                          label={resolvePriceLabel({ isNegotiation, isSale, discountAmount })}
                          value={currencyFormatter.format(
                            isNegotiation ? product.negotiationPrice : product.salePrice,
                          )}
                        />
                        {discountAmount > 0 ? (
                          <>
                            <PriceRow
                              negative
                              label="Descuento"
                              labelAction={removeDiscountAction}
                              value={currencyFormatter.format(discountAmount)}
                            />
                            <PriceRow
                              bold
                              label="Precio Final"
                              value={currencyFormatter.format(finalPrice)}
                            />
                          </>
                        ) : null}
                        <PriceRow
                          negative
                          label="Comisión RAG"
                          value={currencyFormatter.format(commissionAmount)}
                        />
                        <div className="grid grid-cols-[4fr_3fr] items-center gap-x-8">
                          <dt className="text-sm font-semibold text-neutral-900">Tu Ganancia</dt>
                          <dd className="text-sm font-semibold text-neutral-900">
                            {currencyFormatter.format(earning)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {isSale && product.initialStatus === 'Apartado' && !isPaid ? (
                    <>
                      <div className="mt-4 grid grid-cols-[2fr_1fr] items-center gap-x-8 text-sm">
                        <span className="text-neutral-500">Anticipo (30%)</span>
                        <span className="text-right text-neutral-400">
                          {currencyFormatter.format(pending * 0.3)}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-[2fr_1fr] items-center gap-x-8 text-sm">
                        <span className="text-neutral-500">Liquidación (70%)</span>
                        <span className="text-right text-neutral-400">
                          {currencyFormatter.format(pending * 0.7)}
                        </span>
                      </div>
                    </>
                  ) : isSale ? (
                    <div className="mt-4 grid grid-cols-[2fr_1fr] items-center gap-x-8 text-sm">
                      <span className="text-neutral-500">{isPaid ? 'Pagado' : 'Por pagar'}</span>
                      <span className="text-right text-neutral-400">
                        {currencyFormatter.format(isPaid ? paid : pending)}
                      </span>
                    </div>
                  ) : null}

                  {isNegotiation ? (
                    <div className="mt-6 flex gap-4">
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={respondNegotiation.isPending}
                        className="flex-1 rounded-full bg-neutral-200 py-4 text-sm font-medium text-neutral-900 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={respondNegotiation.isPending}
                        className="bg-brand flex-1 rounded-full py-3 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Aceptar
                      </button>
                    </div>
                  ) : null}

                  {isSale ? (
                    <div className="mt-6 border-t border-neutral-200 pt-6">
                      <h3 className="text-sm font-semibold text-neutral-900">Historial de Pagos</h3>
                      {payments && payments.length > 0 ? (
                        <ul className="mt-4 space-y-3">
                          {payments.map((payment) => (
                            <PaymentRow key={payment.id} payment={payment} />
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-4 text-sm text-neutral-400">Sin pagos registrados.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="hidden md:block">
              <LandingFooter isAuthenticated />
            </div>

            {showDiscountButton ? (
              <ApplyDiscountModal
                key={discountModalOpen ? 'discount-open' : 'discount-closed'}
                open={discountModalOpen}
                productId={product.id}
                clientId={product.clientId}
                currentPrice={product.salePrice}
                commissionAmount={commissionAmount}
                existingDiscountType={existingDiscountType}
                existingDiscountValue={existingDiscountValue}
                onClose={() => setDiscountModalOpen(false)}
              />
            ) : null}

            <ConfirmDialog
              open={confirmRemoveOpen}
              title="Eliminar descuento"
              description="¿Estás seguro de que deseas eliminar el descuento aplicado?"
              cancelLabel="Cancelar"
              confirmLabel={removeDiscount.isPending ? 'Eliminando...' : 'Eliminar'}
              onCancel={() => setConfirmRemoveOpen(false)}
              onConfirm={handleRemoveDiscount}
              destructive
            />
          </>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  value: string;
}

function resolvePriceLabel({
  isNegotiation,
  isSale,
  discountAmount,
}: {
  isNegotiation: boolean;
  isSale: boolean;
  discountAmount: number;
}): string {
  if (isNegotiation) return 'Precio de Negociación';
  if (discountAmount > 0) return 'Precio Original';
  return isSale ? 'Precio de Venta' : 'Precio de Producto';
}

function InfoRow({ label, value }: RowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-xs font-medium text-neutral-700">{label}</dt>
      <dd className="text-xs text-neutral-400">{value || '—'}</dd>
    </div>
  );
}

function PriceRow({
  label,
  value,
  negative = false,
  bold = false,
  labelAction,
}: RowProps & {
  negative?: boolean;
  bold?: boolean;
  labelAction?: ReactNode;
}) {
  const valueNode = (
    <span className="relative">
      {negative ? <span className="absolute -left-3">-</span> : null}
      {value}
    </span>
  );
  return (
    <div className="grid grid-cols-[4fr_3fr] items-center gap-x-8">
      <dt
        className={`flex items-center gap-1.5 text-xs ${bold ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-700'}`}
      >
        {label}
        {labelAction}
      </dt>
      <dd className={`text-xs ${bold ? 'font-semibold text-neutral-900' : 'text-neutral-400'}`}>
        {valueNode}
      </dd>
    </div>
  );
}

function DetailField({ label, value }: RowProps) {
  return (
    <div className="mb-2">
      <p className="text-xs font-medium text-neutral-700">{label}</p>
      <p className="mt-1 text-xs text-neutral-400">{value || '—'}</p>
    </div>
  );
}

function PaymentRow({ payment }: { payment: SellerPayment }) {
  return (
    <li className="rounded-2xl border border-neutral-200 px-5 py-4">
      <div className="flex items-center">
        <p className="text-2xl font-semibold text-neutral-900">
          {currencyFormatter.format(payment.amount)}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-neutral-400">
        <span className="flex items-center gap-1.5">
          <Icon icon="ion:calendar-outline" className="size-4" />
          {payment.date}
        </span>
        {payment.receiptUrl ? (
          <a
            href={payment.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand flex items-center gap-1.5 text-neutral-500 transition-colors"
          >
            <Icon icon="ion:receipt-outline" className="size-4" />
            Comprobante
          </a>
        ) : null}
      </div>
    </li>
  );
}
