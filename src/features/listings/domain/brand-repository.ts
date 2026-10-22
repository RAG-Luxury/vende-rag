export interface Brand {
  id: number;
  name: string;
  /**
   * Whether the seller can pick this brand. Suspended brands stay in the list
   * on purpose — hiding them would make the seller search, fail and leave
   * without knowing why.
   */
  available: boolean;
  /** Why it cannot be picked. The API owns the wording. */
  unavailableReason: string | null;
}

export interface BrandRepository {
  getBrands(signal?: AbortSignal): Promise<readonly Brand[]>;
}
