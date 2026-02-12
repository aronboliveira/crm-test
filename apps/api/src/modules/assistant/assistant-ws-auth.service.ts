import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectId } from 'mongodb';
import { MongoRepository } from 'typeorm';
import UserEntity from '../../entities/UserEntity';
import type { AuthJwtPayload } from '../auth/types/auth-jwt-payload.types';

export type AssistantWsIdentity = Readonly<{
  userId: string;
  email: string;
  role: string;
  perms: readonly string[];
}>;

@Injectable()
export class AssistantWsAuthService {
  private readonly logger = new Logger(AssistantWsAuthService.name);

  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(UserEntity)
    private readonly usersRepo: MongoRepository<UserEntity>,
  ) {}

  async authenticate(rawToken: string): Promise<AssistantWsIdentity | null> {
    const token = this.extractToken(rawToken);
    if (!token) {
      return null;
    }

    try {
      const payload = await this.jwt.verifyAsync<AuthJwtPayload>(token);

      const oid = ObjectId.isValid(payload.sub)
        ? new ObjectId(payload.sub)
        : null;
      if (!oid) {
        return null;
      }

      const user = await this.usersRepo.findOne({ where: { _id: oid } as any });
      if (!user) {
        return null;
      }

      if ((user as any).disabled) {
        return null;
      }

      const tokenVersion =
        typeof (user as any).tokenVersion === 'number'
          ? ((user as any).tokenVersion as number)
          : 1;

      if (payload.tv !== tokenVersion) {
        return null;
      }

      return {
        userId: String((user as any)._id),
        email: String((user as any).email ?? ''),
        role: String(payload.role ?? 'viewer'),
        perms: Array.isArray(payload.perms) ? payload.perms : [],
      };
    } catch (error) {
      this.logger.warn(
        `WS token authentication failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private extractToken(rawToken: string): string {
    const input = String(rawToken ?? '').trim();
    if (!input) {
      return '';
    }
    return input.replace(/^Bearer\s+/i, '').trim();
  }
}
