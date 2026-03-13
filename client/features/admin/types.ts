export type AccessInvite = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "revoked";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  activatedAt: string | null;
  invitedByUserId: string | null;
  acceptedByUserId: string | null;
  activatedByUserId: string | null;
  sourceType: "product_admin" | "family_invite" | "self_registration";
  sourceFamilyId: string | null;
  sourceFamilyName: string | null;
  sourceCreatedByUserId: string | null;
  sourceCreatedByLabel: string | null;
  invitedByLabel: string | null;
  acceptedByLabel: string | null;
  activatedByLabel: string | null;
};

export type ProductFeatureFlag = {
  featureKey: string;
  isEnabled: boolean;
  updatedAt: string | null;
  updatedByUserId: string | null;
  updatedByLabel: string | null;
};

export type PushEventFlag = {
  eventKey: string;
  isEnabled: boolean;
  updatedAt: string | null;
  updatedByUserId: string | null;
  updatedByLabel: string | null;
};
