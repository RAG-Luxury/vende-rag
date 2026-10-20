import type { DesignerRepository } from '@/src/features/designers/domain/designer-repository';
import { httpRequest } from '@/src/shared/infrastructure/http/http-client';
import { designersResponseSchema } from './designer-schemas';

export const designerHttpRepository = {
  async getDesigners(signal) {
    const response = await httpRequest('/web/catalogo-de-disenadores', {
      schema: designersResponseSchema,
      ...(signal ? { signal } : {}),
    });

    return response.data.map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      available: item.available !== false,
      unavailableReason: item.unavailable_reason ?? null,
    }));
  },
} satisfies DesignerRepository;
