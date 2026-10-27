import type {
  AccountRepository,
  AddressInput,
  PaymentMethodInput,
} from '@/src/features/account/domain/account-repository';
import { env } from '@/src/shared/infrastructure/env/env';
import { httpRequest } from '@/src/shared/infrastructure/http/http-client';
import { getContractUrl } from '@/src/shared/infrastructure/images/contract-document';
import {
  accountMutationResponseSchema,
  banksResponseSchema,
  clientProfileResponseSchema,
  clientProfileSummaryResponseSchema,
  contractSignatureConfirmSchema,
  contractSignatureResponseSchema,
  contractUploadResponseSchema,
  deleteAccountResponseSchema,
  signContractResponseSchema,
  updateProfileResponseSchema,
} from './account-schemas';

function toAddressBody(data: AddressInput) {
  return {
    calle: data.street,
    colonia: data.neighborhood,
    noe: data.exteriorNumber,
    noi: data.interiorNumber,
    ciudad: data.city,
    estado: data.state,
    pais: data.country,
    cp: data.postalCode,
    referencia: data.reference,
  };
}

function toPaymentMethodBody(data: PaymentMethodInput) {
  return {
    banco: data.bank,
    nombre: data.holder,
    cuenta: data.accountNumber,
    clabe: data.clabe,
  };
}

function normalizeContractUploadReference(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const contractBaseUrl = env.NEXT_PUBLIC_CONTRACT_BASE_URL.replace(/\/+$/, '');

  try {
    const url = new URL(trimmed);
    if (url.href.startsWith(`${contractBaseUrl}/`)) {
      return decodeURIComponent(url.href.slice(contractBaseUrl.length + 1));
    }

    return decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? trimmed);
  } catch {
    return trimmed.replace(/^\/+/, '');
  }
}

export const accountHttpRepository = {
  async getProfile(clientId, signal) {
    const response = await httpRequest(`/web/client/${clientId}`, {
      schema: clientProfileResponseSchema,
      ...(signal ? { signal } : {}),
    });

    const [profile] = response.data.profile;
    if (!profile) throw new Error('Client profile is missing personal data');

    const [address] = response.data.adress;
    const [paymentMethod] = response.data.paymentMethod;

    return {
      id: response.data.id,
      email: response.data.email,
      firstName: profile.name,
      lastName: profile.lastname,
      phone: response.data.phone,
      contract: response.data.contrato ? getContractUrl(response.data.contrato) : null,
      contractSigned: Boolean(response.data.contrato),
      address: address
        ? {
            id: address.id,
            street: address.calle,
            exteriorNumber: address.noe,
            interiorNumber: address.noi,
            neighborhood: address.colonia,
            city: address.ciudad,
            state: address.estado,
            country: address.pais,
            postalCode: address.cp,
            reference: address.referencia ?? null,
            latitude: address.lat ? Number(address.lat) : null,
            longitude: address.lng ? Number(address.lng) : null,
          }
        : null,
      paymentMethod: paymentMethod
        ? {
            id: paymentMethod.id,
            bank: paymentMethod.banco,
            holder: paymentMethod.nombre,
            accountNumber: paymentMethod.cuenta,
            clabe: paymentMethod.CLABE,
          }
        : null,
    };
  },

  async getProfileSummary(clientId, signal) {
    const response = await httpRequest(`/web/client/profile/${clientId}`, {
      schema: clientProfileSummaryResponseSchema,
      ...(signal ? { signal } : {}),
    });

    return {
      firstName: response.data.name,
      lastName: response.data.lastname,
    };
  },

  async updateProfile(clientId, data, signal) {
    await httpRequest(`/web/client/profile/${clientId}`, {
      method: 'PATCH',
      body: {
        nombres: data.firstName,
        apellidos: data.lastName,
        telefono: data.phone,
        email: data.email,
      },
      schema: updateProfileResponseSchema,
      ...(signal ? { signal } : {}),
    });
  },

  async deleteAccount(clientId) {
    await httpRequest(`/web/client/${clientId}`, {
      method: 'DELETE',
      schema: deleteAccountResponseSchema,
    });
  },

  async createAddress(clientId, data, signal) {
    await httpRequest(`/web/client/address/${clientId}`, {
      method: 'POST',
      body: toAddressBody(data),
      schema: accountMutationResponseSchema,
      ...(signal ? { signal } : {}),
    });
  },

  async updateAddress(clientId, data, signal) {
    await httpRequest(`/web/client/address/${clientId}`, {
      method: 'PATCH',
      body: toAddressBody(data),
      schema: accountMutationResponseSchema,
      ...(signal ? { signal } : {}),
    });
  },

  async deleteAddress(clientId, signal) {
    await httpRequest(`/web/client/address/${clientId}`, {
      method: 'DELETE',
      schema: accountMutationResponseSchema,
      ...(signal ? { signal } : {}),
    });
  },

  async createPaymentMethod(clientId, data, signal) {
    await httpRequest(`/web/client/payment-method/${clientId}`, {
      method: 'POST',
      body: toPaymentMethodBody(data),
      schema: accountMutationResponseSchema,
      ...(signal ? { signal } : {}),
    });
  },

  async updatePaymentMethod(clientId, data, signal) {
    await httpRequest(`/web/client/payment-method/${clientId}`, {
      method: 'PATCH',
      body: toPaymentMethodBody(data),
      schema: accountMutationResponseSchema,
      ...(signal ? { signal } : {}),
    });
  },

  async deletePaymentMethod(clientId, signal) {
    await httpRequest(`/web/client/payment-method/${clientId}`, {
      method: 'DELETE',
      schema: accountMutationResponseSchema,
      ...(signal ? { signal } : {}),
    });
  },

  async getBanks(signal) {
    const response = await httpRequest('/banks?page=1&limit=50', {
      schema: banksResponseSchema,
      ...(signal ? { signal } : {}),
    });

    return response.data;
  },

  async uploadAndSignContract(clientId, pdfBlob, fileName, signal) {
    // The contract file itself is hosted by front-rag in main. api_rga only
    // persists the normalized file reference in clients.contrato.
    const uploadOrigin = new URL(env.NEXT_PUBLIC_CONTRACT_BASE_URL).origin;
    const formData = new FormData();
    formData.append('file', pdfBlob, fileName);

    const uploadResponse = await fetch(
      `${uploadOrigin}/api/filepond-mode-server/process?folder=clientes`,
      {
        method: 'POST',
        body: formData,
        ...(signal ? { signal } : {}),
      },
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => '');
      throw new Error(errorText || 'Error al subir el contrato');
    }

    const uploadJson: unknown = await uploadResponse.json();
    const uploadResult = contractUploadResponseSchema.parse(uploadJson);
    const uploadedReference = uploadResult.nameFile ?? uploadResult.key;

    if (!uploadedReference) {
      throw new Error('Error al subir el contrato');
    }

    await httpRequest('/web/client/contrato', {
      method: 'PATCH',
      body: { contrato: normalizeContractUploadReference(uploadedReference) },
      schema: signContractResponseSchema,
      ...(signal ? { signal } : {}),
    });
  },

  async requestContractSignature(signal) {
    // No clientId in the path or body: api_rga reads it from the bearer token.
    const response = await httpRequest('/web/client/contrato/firma', {
      method: 'POST',
      schema: contractSignatureResponseSchema,
      ...(signal ? { signal } : {}),
    });

    return {
      envelopeId: response.envelopeId,
      url: response.url,
      mock: response.mock ?? false,
    };
  },

  async confirmContractSignature(envelopeId, signal) {
    const response = await httpRequest('/web/client/contrato/firma/confirmar', {
      method: 'POST',
      body: { envelopeId },
      schema: contractSignatureConfirmSchema,
      ...(signal ? { signal } : {}),
    });

    return {
      stored: response.stored ?? false,
      alreadySigned: response.alreadySigned ?? false,
    };
  },
} satisfies AccountRepository;
