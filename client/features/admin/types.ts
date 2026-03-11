export type AccessInvite = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  invitedByUserId: string | null;
  acceptedByUserId: string | null;
  invitedByLabel: string | null;
  acceptedByLabel: string | null;
};

export type ProductFeatureFlag = {
  featureKey: string;
  isEnabled: boolean;
  updatedAt: string | null;
  updatedByUserId: string | null;
  updatedByLabel: string | null;
};
