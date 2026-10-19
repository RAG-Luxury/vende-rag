import { calculateSellerPriceBreakdown } from '@/src/features/product-views/domain/price-breakdown';
import { findProductStatusByCode } from '@/src/features/product-views/domain/product-status';
import type { ProductViewRepository } from '@/src/features/product-views/domain/product-view-repository';
import { httpRequest } from '@/src/shared/infrastructure/http/http-client';
import { getProductImageUrl } from '@/src/shared/infrastructure/images/product-image';
import { resolveReceiptUrl } from '@/src/shared/infrastructure/images/receipt-document';
import {
  applyDiscountResponseSchema,
  removeDiscountResponseSchema,
  commissionResponseSchema,
  negotiationResponseSchema,
  productDetailResponseSchema,
  productIdByUuidResponseSchema,
  productPriceResponseSchema,
  productsResponseSchema,
  sellerPaymentsResponseSchema,
} from './product-view-schemas';

function resolveImageUrl(path: string): string {
  if (path.startsWith('http')) return path.replace(/([^:])\/\/+/g, '$1/');
  return getProductImageUrl(path.replace(/^\/+/, ''));
}

export const productViewHttpRepository = {
  async getProducts(view, clientId, query, signal) {
    const params = new URLSearchParams();
    const q = query.q?.trim();
    if (q) params.set('q', q);

    const search = params.toString();
    const path = `/web/products/${view}/${clientId}${search ? `?${search}` : ''}`;

    const response = await httpRequest(path, {
      schema: productsResponseSchema,
      ...(signal ? { signal } : {}),
    });

    return response.data.map((item) => {
      const { discountAmount, finalPrice } = calculateSellerPriceBreakdown(item.original_price, {
        fixedDiscount: item.precio_descuento,
        percentageDiscount: item.porcentaje_descuento,
      });

      return {
        id: item.id,
        uuid: item.uuid,
        name: item.nombre?.trim() || `${item.marca} ${item.modelo ?? ''}`.trim() || 'Sin título',
        brand: item.marca,
        salePrice: item.original_price,
        discountAmount,
        finalPrice,
        earning: item.precio,
        status: item.Estado,
        statusCode: item.status ?? 0,
        initialStatus: item.initial_status ?? '',
        image: item.galeria?.[0] ? resolveImageUrl(item.galeria[0]) : '',
      };
    });
  },

  async getSellerPayments(productId, signal) {
    const response = await httpRequest(`/web/products/${productId}/seller-payments`, {
      schema: sellerPaymentsResponseSchema,
      ...(signal ? { signal } : {}),
    });

    return response.data.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      date: payment.payment_date,
      method: payment.payment_method,
      receiptUrl: resolveReceiptUrl(payment),
    }));
  },

  async getProductDetail(productId, signal) {
    const response = await httpRequest(`/web/products/${productId}/detail`, {
      schema: productDetailResponseSchema,
      ...(signal ? { signal } : {}),
    });

    const data = response.data;
    const salePrice = data.original_price || (data.rag ?? 0);
    const discountPercent = data.porcentaje_descuento ?? 0;
    const { discountAmount, finalPrice } = calculateSellerPriceBreakdown(salePrice, {
      fixedDiscount: data.precio_descuento,
      percentageDiscount: data.porcentaje_descuento,
    });
    return {
      id: data.id,
      clientId: data.client_id,
      uuid: data.uuid,
      name: data.name_product ?? data.modelo ?? '',
      status: data.estatus || data.Estado || findProductStatusByCode(data.state ?? 0)?.label || '',
      statusCode: data.state ?? 0,
      initialStatus: data.initial_status ?? '',
      brand: data.marca ?? '',
      model: data.modelo ?? '',
      department: data.departamento ?? '',
      category: data.categoria ?? '',
      subcategory: data.subcategoria ?? '',
      color: data.color ?? '',
      detail: data.detalle ?? '',
      soldDate: data.Fecha ?? '',
      salePrice,
      discountAmount,
      finalPrice,
      discountPercent,
      negotiationPrice: data.rag || data.precio,
      earning: data.precio,
      commission: salePrice - data.precio,
      images: (data.galeria ?? []).map(resolveImageUrl),
      hasPhotos: Boolean(data.fotos),
      hasVideo: Boolean(data.video),
      hasTag: Boolean(data.etiquetado),
      isAuthenticated: Boolean(data.autenticado),
      estimatedActivationDate: data.estimated_activation_date ?? null,
      receivedDate: data.preaprobado_date ?? null,
    };
  },

  async getProductIdByUuid(uuid, signal) {
    const response = await httpRequest(`/web/products/by-uuid/${uuid}`, {
      schema: productIdByUuidResponseSchema,
      ...(signal ? { signal } : {}),
    });

    return response.data.id;
  },

  async getProductPrice(productId, signal) {
    const params = new URLSearchParams({ product_id: String(productId) });
    const response = await httpRequest(`/web/products/price?${params.toString()}`, {
      schema: productPriceResponseSchema,
      ...(signal ? { signal } : {}),
    });

    const data = response.data;
    const { discountAmount, finalPrice } = calculateSellerPriceBreakdown(data.original_price, {
      fixedDiscount: data.fixed_discount,
      percentageDiscount: data.percentage_discount,
    });

    return {
      originalPrice: data.original_price,
      discountAmount,
      finalPrice,
      commissionRate: data.commission_rate,
      commissionAmount: data.commission_amount,
      sellerPrice: data.seller_price,
    };
  },

  async getCommission(price, clientId, signal) {
    const params = new URLSearchParams({ price: String(price), user_id: String(clientId) });
    const response = await httpRequest(`/web/products/comission?${params.toString()}`, {
      schema: commissionResponseSchema,
      ...(signal ? { signal } : {}),
    });

    const { commission } = response.data;
    return {
      rate: commission.rate,
      sellerNet: commission.seller_net,
      amount: price - commission.seller_net,
    };
  },

  async respondNegotiation(productId, decision, signal) {
    const body =
      decision.action === 'aprobar'
        ? {
            action: decision.action,
            approve_price: decision.approvePrice,
            comment_approval: decision.comment,
          }
        : { action: decision.action, comment_rejection: decision.comment };

    await httpRequest(`/web/products/${productId}/negociacion`, {
      method: 'PATCH',
      body,
      schema: negotiationResponseSchema,
      ...(signal ? { signal } : {}),
    });
  },

  async applyDiscount(productId, type, value, signal) {
    const response = await httpRequest(`/web/products/${productId}/discount`, {
      method: 'PATCH',
      body: { type, value },
      schema: applyDiscountResponseSchema,
      ...(signal ? { signal } : {}),
    });

    return {
      discountedPrice: response.data.discounted_price,
      costoSeller: response.data.costo_seller,
    };
  },

  async removeDiscount(productId, signal) {
    await httpRequest(`/web/products/${productId}/discount`, {
      method: 'DELETE',
      schema: removeDiscountResponseSchema,
      ...(signal ? { signal } : {}),
    });
  },
} satisfies ProductViewRepository;
