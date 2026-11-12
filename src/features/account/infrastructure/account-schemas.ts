import { z } from 'zod';

const addressSchema = z.object({
  id: z.number(),
  calle: z.string(),
  colonia: z.string(),
  noe: z.string(),
  noi: z.string(),
  ciudad: z.string(),
  estado: z.string(),
  pais: z.string(),
  cp: z.string(),
  referencia: z.string().nullish(),
  lat: z.string().nullish(),
  lng: z.string().nullish(),
});

const paymentMethodSchema = z.object({
  id: z.number(),
  banco: z.string(),
  nombre: z.string(),
  cuenta: z.string(),
  CLABE: z.string(),
});

export const clientProfileResponseSchema = z.object({
  data: z.object({
    id: z.number(),
    email: z.string(),
    phone: z.string(),
    contrato: z.string().nullable(),
    // Lo decide el API (docusign si hay credenciales, upload si no). Opcional
    // para no romper si una version vieja del backend aun no lo manda.
    contractSigning: z.enum(['upload', 'docusign']).optional(),
    adress: z.array(addressSchema),
    paymentMethod: z.array(paymentMethodSchema),
    profile: z
      .array(
        z.object({
          name: z.string(),
          lastname: z.string(),
        }),
      )
      .min(1),
  }),
});

export const clientProfileSummaryResponseSchema = z.object({
  data: z.object({
    name: z.string(),
    lastname: z.string(),
  }),
});

export const updateProfileResponseSchema = z.unknown();

export const deleteAccountResponseSchema = z.unknown();

export const accountMutationResponseSchema = z.unknown();

export const banksResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    }),
  ),
});

export const contractUploadResponseSchema = z.object({
  status: z.string(),
  key: z.string().nullable(),
  nameFile: z.string().nullable(),
  msg: z.string().nullable(),
});

export const r2UploadResponseSchema = z.object({
  success: z.boolean(),
  key: z.string(),
  url: z.string(),
});

export const signContractResponseSchema = z.unknown();

/**
 * api_rga returns the single-use signing url. `mock` is true while the API runs
 * without DocuSign credentials, and the url then points nowhere real — the UI
 * says so instead of rendering a frame that cannot load.
 */
export const contractSignatureResponseSchema = z.object({
  success: z.boolean(),
  envelopeId: z.string(),
  url: z.string().url(),
  mock: z.boolean().optional(),
});

export const contractSignatureConfirmSchema = z.object({
  success: z.boolean(),
  stored: z.boolean().optional(),
  alreadySigned: z.boolean().optional(),
  url: z.string().optional(),
});
