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
