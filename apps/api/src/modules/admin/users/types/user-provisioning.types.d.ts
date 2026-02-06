export type nlStr = string | null;

export type ProvisioningResult = Readonly<{
  ok: boolean;
  expiresAt: nlStr;
  token: nlStr;
}>;

export interface UserProvisioningStrategy {
  canHandle: (kind: string) => boolean;
  provision: (args: {
    email: string;
    ip?: string;
    ua?: string;
    data?: Record<string, any>;
  }) => Promise<ProvisioningResult>;
}
