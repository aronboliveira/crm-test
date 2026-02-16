import { Entity, Column, ObjectIdColumn, Index } from 'typeorm';
import { ObjectId } from 'mongodb';
import type { RoleKey } from '../types/permissions';

@Entity('users')
export default class UserEntity {
  @ObjectIdColumn()
  _id!: ObjectId;

  @Index({ unique: true })
  @Column()
  email!: string;

  @Index({ unique: true })
  @Column()
  username!: string;

  @Column()
  name?: string;

  @Column()
  firstName?: string;

  @Column()
  lastName?: string;

  @Column()
  phone?: string;

  @Column()
  department?: string;

  @Column()
  notes?: string;

  @Column()
  passwordHash!: string;

  @Column()
  tokenVersion!: number;

  @Column()
  passwordUpdatedAt?: string;

  @Column()
  roles!: RoleKey[];

  @Column()
  disabled!: boolean;

  @Column()
  createdAt!: string;

  @Column()
  updatedAt!: string;

  @Column()
  lockedAt?: string;

  @Column()
  lockedReason?: string;

  @Column()
  resetSeries?: number;

  @Column()
  avatarUrl?: string;

  @Column()
  avatarStoragePath?: string;

  @Column()
  avatarMimeType?: string;

  @Column()
  jobTitle?: string;

  @Column()
  timezone?: string;

  @Column()
  locale?: string;

  @Column()
  bio?: string;

  @Column()
  emailVerified?: boolean;

  @Column()
  emailVerifiedAt?: string;

  @Column()
  lastLoginAt?: string;

  @Column()
  twoFactorEnabled?: boolean;

  @Column()
  twoFactorSecret?: string;

  @Column()
  twoFactorTempSecret?: string;

  @Column()
  twoFactorEnabledAt?: string;

  @Column()
  twoFactorRecoveryCodes?: string[];

  /* ─── SSO / OAuth linked accounts ─── */

  /** Array of linked OAuth providers, e.g. [{ provider: 'google', providerId: '1234', ... }] */
  @Column()
  oauthAccounts?: OAuthLinkedAccount[];
}

/**
 * Embedded sub-document representing a linked OAuth provider account.
 * Stored inline in the UserEntity `oauthAccounts` array (MongoDB embedded docs).
 */
export interface OAuthLinkedAccount {
  /** OAuth provider key — 'google' | 'microsoft' | 'nextcloud' */
  provider: 'google' | 'microsoft' | 'nextcloud';
  /** Unique user identifier from the provider (sub / oid / uid) */
  providerId: string;
  /** Email reported by the provider at last login */
  email?: string;
  /** Display name from provider profile */
  displayName?: string;
  /** Avatar / photo URL from provider */
  avatarUrl?: string;
  /** ISO date when this link was first created */
  linkedAt: string;
  /** ISO date of the most recent login via this provider */
  lastUsedAt?: string;
}
