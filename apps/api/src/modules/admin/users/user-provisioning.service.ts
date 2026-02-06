import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  ProvisioningResult,
  UserProvisioningStrategy,
} from './types/user-provisioning.types';

export const USER_PROVISIONING_STRATEGIES = 'USER_PROVISIONING_STRATEGIES';

@Injectable()
export default class UserProvisioningService {
  private readonly logger = new Logger(UserProvisioningService.name);

  constructor(
    @Inject(USER_PROVISIONING_STRATEGIES)
    private readonly strategies: readonly UserProvisioningStrategy[],
  ) {
    try {
      if (!strategies || strategies.length === 0) {
        this.logger.warn('No provisioning strategies provided');
      } else {
        this.logger.log(
          `UserProvisioningService initialized with ${strategies.length} strategies`,
        );
      }
    } catch (error) {
      this.logger.error('UserProvisioningService constructor error:', error);
      throw error;
    }
  }

  async provision(
    kind: string,
    args: { email: string; ip?: string; ua?: string; data?: any },
  ): Promise<ProvisioningResult> {
    try {
      const k = String(kind || '')
        .trim()
        .toLowerCase();
      const s = this.strategies.find((x) => {
        try {
          return x.canHandle(k);
        } catch (error) {
          this.logger.error('Error checking strategy canHandle:', error);
          return false;
        }
      });

      if (!s) {
        this.logger.warn(`No strategy found for kind: ${kind}`);
        return { ok: false, expiresAt: null, token: null };
      }

      return await s.provision(args);
    } catch (error) {
      this.logger.error('Error in provision:', error);
      return { ok: false, expiresAt: null, token: null };
    }
  }
}
