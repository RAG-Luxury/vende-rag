'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Icon } from '@iconify/react';
import type { Product } from '@/src/features/product-views/domain/product-view-repository';
import {
  isPublicationProgress,
  resolvePublicationPillLabel,
} from '@/src/features/product-views/domain/publication-status';
import { getStatusStyle } from './product-status';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

interface CardSecondary {
  label: string;
  value: number;
}

interface ProductCardProps {
  product: Product;
  secondary: CardSecondary;
  isSale: boolean;
  heightPx?: number | undefined;
}

export function ProductCard({ product, secondary, isSale, heightPx = 350 }: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = product.image !== '' && !imageFailed;

  const pillStatus = isPublicationProgress(product.statusCode)
    ? resolvePublicationPillLabel(product.statusCode)
    : product.status;

  return (
    <article
      className="flex w-48 flex-col rounded-[20px] border border-[#ececec] bg-white p-4"
      style={{ minHeight: `${heightPx}px` }}
    >
      <div className=" mb-2.5  flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <p className="text-[10px] text-[#9A9A9A]">
            #{product.id}
            {isSale && product.initialStatus ? ` / ${product.initialStatus}` : ''}
          </p>
        </span>
      </div>

      <div className="relative mx-auto aspect-square w-40 overflow-hidden rounded-[14px] bg-neutral-100">
        {showImage ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="200px"
            className="object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-300">
            <Icon icon="ion:image-outline" className="size-10" />
          </div>
        )}
      </div>

      <h3 className="mt-3 ml-2 truncate text-[13px] leading-tight font-light tracking-[-0.01em] text-[#1F1F1F]">
        {product.name}
      </h3>
      <p className="mt-[12px] ml-2 text-[15px] leading-none tracking-[-0.03em] text-[#151515]">
        Precio: {currencyFormatter.format(secondary.value)}
      </p>
      <p className="mt-[12px] ml-2 text-[13px] leading-[1.4] text-[#777777]">
        Ganancia: {currencyFormatter.format(product.earning)}
      </p>

      <span
        className="mt-[12px] w-full rounded-full py-[7px] text-center text-[12px] font-medium"
        style={getStatusStyle(pillStatus)}
      >
        {pillStatus}
      </span>
    </article>
  );
}
