import { z } from 'zod';

export const brandsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      // Nullish on purpose: an API deployment without these fields must not
      // break the screen. The repository defaults to available.
      available: z.boolean().nullish(),
      unavailable_reason: z.string().nullish(),
    }),
  ),
});
