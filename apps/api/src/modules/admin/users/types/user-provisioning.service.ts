import { Inject, Injectable } from '@nestjs/common';
import type {
  ProvisioningResult,
  UserProvisioningStrategy,
} from './user-provisioning.types';

export const USER_PROVISIONING_STRATEGIES = 'USER_PROVISIONING_STRATEGIES';

@Injectable()
export default class UserProvisioningService {
  constructor(
    @Inject(USER_PROVISIONING_STRATEGIES)
    private readonly strategies: readonly UserProvisioningStrategy[],
  ) {}

  async provision(
    kind: string,
    args: {
      email: string;
      ip?: string;
      ua?: string;
      data?: Record<string, any>;
    },
  ): Promise<ProvisioningResult> {
    const k = String(kind || '')
      .trim()
      .toLowerCase();
    const s = this.strategies.find((x) => {
      try {
        return x.canHandle(k);
      } catch {
        return false;
      }
    });
    return s ? s.provision(args) : { ok: false, expiresAt: null, token: null };
  }
}
