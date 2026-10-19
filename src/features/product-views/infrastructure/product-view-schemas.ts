import { z } from 'zod';

export const productsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(
    z.object({
      id: z.number(),
      uuid: z.string(),
      marca: z.string(),
      modelo: z.string().nullish(),
      nombre: z.string().nullish(),
      // Coerce, como el resto de los precios de este mismo objeto: el API los
      // envia desde columnas DECIMAL y a veces llegan como texto. Un z.number()
      // estricto convertia eso en un error de pantalla completa.
      original_price: z.coerce.number(),
      precio: z.coerce.number(),
      porcentaje_descuento: z.coerce.number().nullish(),
      precio_descuento: z.coerce.number().nullish(),
      Estado: z.string(),
      status: z.coerce.number().nullish(),
      initial_status: z.string().nullish(),
      galeria: z.array(z.string()).nullish(),
    }),
  ),
});

export const productDetailResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.number(),
    client_id: z.number(),
    uuid: z.string(),
    name_product: z.string().nullish(),
    modelo: z.string().nullish(),
    marca: z.string().nullish(),
    departamento: z.string().nullish(),
    categoria: z.string().nullish(),
    subcategoria: z.string().nullish(),
    color: z.string().nullish(),
    detalle: z.string().nullish(),
    estatus: z.string().nullish(),
    Estado: z.string().nullish(),
    initial_status: z.string().nullish(),
    state: z.coerce.number().nullish(),
    Fecha: z.string().nullish(),
    original_price: z.coerce.number(),
    precio: z.coerce.number(),
    porcentaje_descuento: z.coerce.number().nullish(),
    precio_descuento: z.coerce.number().nullish(),
    rag: z.coerce.number().nullish(),
    galeria: z.array(z.string()).nullish(),
    fotos: z.coerce.number().nullish(),
    video: z.coerce.number().nullish(),
    etiquetado: z.coerce.number().nullish(),
    autenticado: z.coerce.number().nullish(),
    estimated_activation_date: z.string().nullish(),
    preaprobado_date: z.string().nullish(),
  }),
});

export const negotiationResponseSchema = z.object({
  success: z.boolean(),
});

export const applyDiscountResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    product_id: z.number(),
    price: z.number(),
    discounted_price: z.number(),
    costo_seller: z.number(),
    discount_type: z.enum(['fixed', 'percentage']),
    discount_value: z.number(),
  }),
});

export const removeDiscountResponseSchema = z.object({
  success: z.boolean(),
});

export const productIdByUuidResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.number(),
  }),
});

export const productPriceResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    product_id: z.coerce.number(),
    original_price: z.coerce.number(),
    fixed_discount: z.coerce.number().nullish(),
    percentage_discount: z.coerce.number().nullish(),
    commission_rate: z.coerce.number(),
    commission_amount: z.coerce.number(),
    seller_price: z.coerce.number(),
  }),
});

export const commissionResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    price: z.number(),
    user_id: z.number(),
    commission: z.object({
      type: z.string(),
      rate: z.number(),
      seller_net: z.number(),
    }),
  }),
});

export const sellerPaymentsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(
    z.object({
      id: z.number(),
      amount: z.coerce.number(),
      payment_date: z.string(),
      payment_method: z.string(),
      receipt_path: z.string().nullish(),
      receipt_url: z.string().nullish(),
    }),
  ),
});
