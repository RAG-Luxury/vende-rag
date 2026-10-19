export type ProductView = 'solicitudes' | 'publicaciones' | 'devoluciones' | 'ventas';

export interface Product {
  id: number;
  uuid: string;
  name: string;
  brand: string;
  salePrice: number;
  discountAmount: number;
  finalPrice: number;
  earning: number;
  status: string;
  statusCode: number;
  initialStatus: string;
  image: string;
}

export interface ProductViewQuery {
  q?: string;
}

export interface SellerPayment {
  id: number;
  amount: number;
  date: string;
  method: string;
  receiptUrl: string | null;
}

export interface ProductPrice {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  commissionRate: number;
  commissionAmount: number;
  sellerPrice: number;
}

export interface ProductCommission {
  rate: number;
  amount: number;
  sellerNet: number;
}

export interface ProductDetail {
  id: number;
  clientId: number;
  uuid: string;
  name: string;
  status: string;
  statusCode: number;
  initialStatus: string;
  brand: string;
  model: string;
  department: string;
  category: string;
  subcategory: string;
  color: string;
  detail: string;
  soldDate: string;
  salePrice: number;
  discountAmount: number;
  finalPrice: number;
  discountPercent: number;
  negotiationPrice: number;
  earning: number;
  commission: number;
  images: readonly string[];
  hasPhotos: boolean;
  hasVideo: boolean;
  hasTag: boolean;
  isAuthenticated: boolean;
  estimatedActivationDate: string | null;
  receivedDate: string | null;
}

export type NegotiationDecision =
  | { action: 'aprobar'; approvePrice: number; comment: string }
  | { action: 'rechazar'; comment: string };

export type DiscountType = 'fixed' | 'percentage';

export interface ApplyDiscountResult {
  discountedPrice: number;
  costoSeller: number;
}

export interface ProductViewRepository {
  getProducts(
    view: ProductView,
    clientId: number,
    query: ProductViewQuery,
    signal?: AbortSignal,
  ): Promise<readonly Product[]>;
  getSellerPayments(productId: number, signal?: AbortSignal): Promise<readonly SellerPayment[]>;
  getProductDetail(productId: number, signal?: AbortSignal): Promise<ProductDetail>;
  getProductIdByUuid(uuid: string, signal?: AbortSignal): Promise<number>;
  getProductPrice(productId: number, signal?: AbortSignal): Promise<ProductPrice>;
  getCommission(price: number, clientId: number, signal?: AbortSignal): Promise<ProductCommission>;
  respondNegotiation(
    productId: number,
    decision: NegotiationDecision,
    signal?: AbortSignal,
  ): Promise<void>;
  applyDiscount(
    productId: number,
    type: DiscountType,
    value: number,
    signal?: AbortSignal,
  ): Promise<ApplyDiscountResult>;
  removeDiscount(productId: number, signal?: AbortSignal): Promise<void>;
}
