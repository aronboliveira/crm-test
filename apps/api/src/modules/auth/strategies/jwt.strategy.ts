import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';

import UserEntity from '../../../entities/UserEntity';
import type { AuthJwtPayload } from '../types/auth-jwt-payload.types';

type JwtPayloadWithIat = AuthJwtPayload & Readonly<{ iat?: number }>;

@Injectable()
export default class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: MongoRepository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'dev_secret_change_me',
      ignoreExpiration: false,
    });
    try {
      if (!usersRepo) {
        this.logger.error('Repository not injected');
        throw new Error('Repository initialization failed');
      }
      this.logger.log('JwtStrategy initialized');
    } catch (error) {
      this.logger.error('JwtStrategy constructor error:', error);
      throw error;
    }
  }

  async validate(payload: JwtPayloadWithIat) {
    try {
      const oid = ObjectId.isValid(payload.sub)
        ? new ObjectId(payload.sub)
        : null;
      if (!oid) {
        this.logger.warn('Invalid ObjectId in token');
        throw new UnauthorizedException('Invalid token');
      }

      const user = await this.usersRepo.findOne({ where: { _id: oid } as any });
      if (!user) {
        this.logger.warn(`User not found for token: ${payload.sub}`);
        throw new UnauthorizedException('Invalid token');
      }

      const tv =
        typeof (user as any).tokenVersion === 'number'
          ? (user as any).tokenVersion
          : 1;
      if (payload.tv !== tv) {
        this.logger.warn(`Token version mismatch for user: ${payload.sub}`);
        throw new UnauthorizedException('Token expired');
      }

      const pwdAt =
        typeof (user as any).passwordUpdatedAt === 'string'
          ? Date.parse((user as any).passwordUpdatedAt)
          : 0;
      const iatMs = typeof payload.iat === 'number' ? payload.iat * 1000 : 0;

      if (pwdAt && (!iatMs || iatMs < pwdAt)) {
        this.logger.warn(
          `Token issued before password update for user: ${payload.sub}`,
        );
        throw new UnauthorizedException('Token expired');
      }

      // Return user with permissions from JWT payload (not from user entity)
      // The permissions are resolved during login and stored in the JWT
      return {
        id: String((user as any)._id),
        email: (user as any).email,
        role: payload.role || (user as any).roleKey || 'viewer',
        perms: payload.perms || [], // Use permissions from JWT payload
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Error validating JWT:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
