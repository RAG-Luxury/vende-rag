import { z } from 'zod';

const serverSchema = z.object({
  BACKEND_URL: z.string().url(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_BACKEND_URL: z.string().url(),
  NEXT_PUBLIC_PRODUCT_IMAGE_BASE_URL: z.string().url(),
  NEXT_PUBLIC_CONTRACT_BASE_URL: z.string().url(),
  NEXT_PUBLIC_RECEIPT_BASE_URL: z.string().url(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().default(''),
});

const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  NEXT_PUBLIC_PRODUCT_IMAGE_BASE_URL: process.env.NEXT_PUBLIC_PRODUCT_IMAGE_BASE_URL,
  NEXT_PUBLIC_CONTRACT_BASE_URL: process.env.NEXT_PUBLIC_CONTRACT_BASE_URL,
  NEXT_PUBLIC_RECEIPT_BASE_URL: process.env.NEXT_PUBLIC_RECEIPT_BASE_URL,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
});

export const env = {
  ...clientEnv,
  get server() {
    if (typeof window !== 'undefined') {
      throw new Error('env.server accessed in the browser');
    }
    return serverSchema.parse({ BACKEND_URL: process.env.BACKEND_URL });
  },
};
