'use client';

import type { ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { env } from '@/src/shared/infrastructure/env/env';
import { AccountRepositoryProvider } from '@/src/features/account/presentation/account-repository-provider';
import { accountHttpRepository } from '@/src/features/account/infrastructure/account-http-repository';
import { AuthRepositoryProvider } from '@/src/features/auth/presentation/auth-repository-provider';
import { authHttpRepository } from '@/src/features/auth/infrastructure/auth-http-repository';
import { FaqRepositoryProvider } from '@/src/features/faq/presentation/faq-repository-provider';
import { faqHttpRepository } from '@/src/features/faq/infrastructure/faq-http-repository';
import { DesignerRepositoryProvider } from '@/src/features/designers/presentation/designer-repository-provider';
import { designerHttpRepository } from '@/src/features/designers/infrastructure/designer-http-repository';
import { BrandRepositoryProvider } from '@/src/features/listings/presentation/brand-repository-provider';
import { brandHttpRepository } from '@/src/features/listings/infrastructure/brand-http-repository';
import { SellerRepositoryProvider } from '@/src/features/listings/presentation/seller-repository-provider';
import { sellerHttpRepository } from '@/src/features/listings/infrastructure/seller-http-repository';
import { CommissionRepositoryProvider } from '@/src/features/listings/presentation/commission-repository-provider';
import { commissionHttpRepository } from '@/src/features/listings/infrastructure/commission-http-repository';
import { ProductRepositoryProvider } from '@/src/features/listings/presentation/product-repository-provider';
import { productHttpRepository } from '@/src/features/listings/infrastructure/product-http-repository';
import { ImageRepositoryProvider } from '@/src/features/listings/presentation/image-repository-provider';
import { imageHttpRepository } from '@/src/features/listings/infrastructure/image-http-repository';
import { TermsRepositoryProvider } from '@/src/features/terms/presentation/terms-repository-provider';
import { termsHttpRepository } from '@/src/features/terms/infrastructure/terms-http-repository';
import { PrivacyRepositoryProvider } from '@/src/features/privacy/presentation/privacy-repository-provider';
import { privacyHttpRepository } from '@/src/features/privacy/infrastructure/privacy-http-repository';
import { ProductViewRepositoryProvider } from '@/src/features/product-views/presentation/product-view-repository-provider';
import { productViewHttpRepository } from '@/src/features/product-views/infrastructure/product-view-http-repository';
import { QueryProvider } from '@/src/shared/infrastructure/query/query-provider';
import { ToastProvider } from '@/src/shared/ui/toast';
import '@/src/shared/ui/register-icons';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <QueryProvider>
        <GoogleOAuthProvider clientId={env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
          <AuthRepositoryProvider repository={authHttpRepository}>
            <AccountRepositoryProvider repository={accountHttpRepository}>
              <FaqRepositoryProvider repository={faqHttpRepository}>
                <DesignerRepositoryProvider repository={designerHttpRepository}>
                  <BrandRepositoryProvider repository={brandHttpRepository}>
                    <SellerRepositoryProvider repository={sellerHttpRepository}>
                      <CommissionRepositoryProvider repository={commissionHttpRepository}>
                        <ImageRepositoryProvider repository={imageHttpRepository}>
                          <ProductRepositoryProvider repository={productHttpRepository}>
                            <TermsRepositoryProvider repository={termsHttpRepository}>
                              <PrivacyRepositoryProvider repository={privacyHttpRepository}>
                                <ProductViewRepositoryProvider
                                  repository={productViewHttpRepository}
                                >
                                  {children}
                                </ProductViewRepositoryProvider>
                              </PrivacyRepositoryProvider>
                            </TermsRepositoryProvider>
                          </ProductRepositoryProvider>
                        </ImageRepositoryProvider>
                      </CommissionRepositoryProvider>
                    </SellerRepositoryProvider>
                  </BrandRepositoryProvider>
                </DesignerRepositoryProvider>
              </FaqRepositoryProvider>
            </AccountRepositoryProvider>
          </AuthRepositoryProvider>
        </GoogleOAuthProvider>
      </QueryProvider>
    </ToastProvider>
  );
}
