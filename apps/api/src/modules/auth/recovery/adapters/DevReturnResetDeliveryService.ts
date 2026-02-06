import { Injectable } from '@nestjs/common';
import type { ResetDeliveryPort } from '../ports/reset-delivery.port';
import { env } from 'process';
// ! NON-PROD MODULE
@Injectable()
export default class DevReturnResetDeliveryService implements ResetDeliveryPort {
  async deliver(
    input: Readonly<{ email: string; token: string }>,
  ): Promise<Readonly<{ devToken?: string }>> {
    if (env.NODE_ENV !== 'production') {
      return { devToken: input.token };
    }
    return {};
  }
}
