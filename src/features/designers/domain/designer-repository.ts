export interface Designer {
  id: number;
  name: string;
  code: string;
  /**
   * Whether the brand is being accepted right now. The designers catalog is
   * the same brand list as the listing form, so it carries the same rule.
   */
  available: boolean;
  /** Why it is not being accepted. The API owns the wording. */
  unavailableReason: string | null;
}

export interface DesignerRepository {
  getDesigners(signal?: AbortSignal): Promise<readonly Designer[]>;
}
