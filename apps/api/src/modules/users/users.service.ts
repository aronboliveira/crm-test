import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import UserEntity from '../../entities/UserEntity';
import UserPreferencesEntity, {
  type ThemeMode,
} from '../../entities/UserPreferencesEntity';
import bcrypt from 'bcryptjs';

type UpdateProfileDto = Readonly<{
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  timezone?: string;
  locale?: string;
  bio?: string;
}>;

type UpdatePreferencesDto = Readonly<{
  theme?: ThemeMode;
  notifications?: Readonly<{
    email?: boolean;
    browser?: boolean;
    taskDue?: boolean;
    mentions?: boolean;
    security?: boolean;
    product?: boolean;
  }>;
}>;

@Injectable()
export default class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly uploadsDir: string;

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: MongoRepository<UserEntity>,
    @InjectRepository(UserPreferencesEntity)
    private readonly preferencesRepo: MongoRepository<UserPreferencesEntity>,
  ) {
    this.uploadsDir = process.env.UPLOADS_DIR || '/tmp/crm-uploads';

    try {
      if (!usersRepo) {
        this.logger.error('UsersRepo not injected');
        throw new Error('Repository initialization failed');
      }
      if (!preferencesRepo) {
        this.logger.error('PreferencesRepo not injected');
        throw new Error('Repository initialization failed');
      }

      fs.mkdirSync(path.join(this.uploadsDir, 'avatars'), { recursive: true });
      this.logger.log('UsersService initialized');
    } catch (error) {
      this.logger.error('UsersService constructor error:', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      const e = email?.trim().toLowerCase();
      if (!e) {
        this.logger.warn('findByEmail called with empty email');
        return null;
      }

      const user = await this.usersRepo.findOne({ where: { email: e } as any });
      if (user) {
        this.logger.log(`User found for email: ${e}`);
      }
      return user ?? null;
    } catch (error) {
      this.logger.error('Error finding user by email:', error);
      return null;
    }
  }

  async list(): Promise<readonly UserEntity[]> {
    try {
      const users = await this.usersRepo.find({ take: 200 } as any);
      this.logger.log(`Retrieved ${users.length} users`);
      return users;
    } catch (error) {
      this.logger.error('Error listing users:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    try {
      if (!ObjectId.isValid(id)) return null;
      return await this.usersRepo.findOne({
        where: { _id: new ObjectId(id) } as any,
      });
    } catch (error) {
      this.logger.error('Error finding user by id:', error);
      return null;
    }
  }

  async getProfileByUserId(userId: string): Promise<
    Readonly<{
      id: string;
      email: string;
      username: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      department?: string;
      jobTitle?: string;
      timezone?: string;
      locale?: string;
      bio?: string;
      avatarUrl?: string;
      emailVerified: boolean;
      twoFactorEnabled?: boolean;
      createdAt: string;
      updatedAt: string;
      lastLoginAt?: string;
    }>
  > {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    return {
      id: String(user._id),
      email: user.email,
      username: user.username,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      department: user.department,
      jobTitle: user.jobTitle,
      timezone: user.timezone,
      locale: user.locale,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      emailVerified: !!user.emailVerified,
      twoFactorEnabled: !!user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async updateProfileByUserId(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ReturnType<UsersService['getProfileByUserId']>> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const currentFirst = this.cleanOptionalText(user.firstName, 120);
    const currentLast = this.cleanOptionalText(user.lastName, 120);
    const hasNameInPayload =
      typeof dto.firstName === 'string' || typeof dto.lastName === 'string';
    const resolvedFirst = this.cleanOptionalText(dto.firstName, 120);
    const resolvedLast = this.cleanOptionalText(dto.lastName, 120);
    const mergedName = this.joinFullName(
      resolvedFirst ?? currentFirst,
      resolvedLast ?? currentLast,
    );

    const patch = {
      firstName: this.cleanOptionalText(dto.firstName, 120),
      lastName: this.cleanOptionalText(dto.lastName, 120),
      name: hasNameInPayload ? mergedName : user.name,
      phone: this.cleanOptionalText(dto.phone, 40),
      department: this.cleanOptionalText(dto.department, 120),
      jobTitle: this.cleanOptionalText(dto.jobTitle, 120),
      timezone: this.cleanOptionalText(dto.timezone, 80),
      locale: this.cleanOptionalText(dto.locale, 35),
      bio: this.cleanOptionalText(dto.bio, 500),
      updatedAt: new Date().toISOString(),
    };

    await this.usersRepo.update({ _id: user._id } as any, patch as any);
    return this.getProfileByUserId(userId);
  }

  async uploadAvatarByUserId(
    userId: string,
    file: Readonly<{ originalname: string; mimetype: string; buffer: Buffer }>,
  ): Promise<Readonly<{ avatarUrl: string }>> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!file?.buffer?.length) {
      throw new BadRequestException('Avatar file is required');
    }

    const mime = String(file.mimetype || '').toLowerCase();
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(mime)) {
      throw new BadRequestException('Avatar must be an image file');
    }

    if (file.buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Avatar must be up to 2MB');
    }

    const ext = this.resolveAvatarExtension(mime, file.originalname);
    const key = `avatars/${String(user._id)}-${Date.now()}.${ext}`;

    const avatarUrl = await this.storeAvatar(file.buffer, mime, key);

    await this.usersRepo.update(
      { _id: user._id } as any,
      {
        avatarUrl,
        avatarStoragePath: key,
        avatarMimeType: mime,
        updatedAt: new Date().toISOString(),
      } as any,
    );

    return { avatarUrl };
  }

  async getAvatarByUserId(userId: string): Promise<
    Readonly<{
      mode: 'redirect' | 'buffer';
      url?: string;
      buffer?: Buffer;
      mimeType?: string;
    }>
  > {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const avatarUrl = String(user.avatarUrl || '').trim();
    const storagePath = String(user.avatarStoragePath || '').trim();
    const mimeType = String(user.avatarMimeType || 'application/octet-stream');

    if (!avatarUrl && !storagePath) {
      throw new NotFoundException('Avatar not found');
    }

    const isRemote = /^https?:\/\//i.test(avatarUrl);
    if (isRemote) {
      return { mode: 'redirect', url: avatarUrl };
    }

    const absPath = path.join(this.uploadsDir, storagePath);
    if (!fs.existsSync(absPath)) {
      throw new NotFoundException('Avatar file not found');
    }

    const buffer = fs.readFileSync(absPath);
    return { mode: 'buffer', buffer, mimeType };
  }

  async getPreferencesByUserId(userId: string): Promise<
    Readonly<{
      theme: ThemeMode;
      notifications: {
        email: boolean;
        browser: boolean;
        taskDue: boolean;
        mentions: boolean;
        security: boolean;
        product: boolean;
      };
      updatedAt?: string;
    }>
  > {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.preferencesRepo.findOne({
      where: { userId } as any,
    });

    if (!existing) {
      return {
        theme: 'system',
        notifications: {
          email: true,
          browser: true,
          taskDue: true,
          mentions: true,
          security: true,
          product: false,
        },
      };
    }

    return {
      theme: this.normalizeThemeMode(existing.theme),
      notifications: {
        email: !!existing.notifyEmail,
        browser: !!existing.notifyBrowser,
        taskDue: !!existing.notifyTaskDue,
        mentions: !!existing.notifyMentions,
        security: !!existing.notifySecurity,
        product: !!existing.notifyProduct,
      },
      updatedAt: existing.updatedAt,
    };
  }

  async updatePreferencesByUserId(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<ReturnType<UsersService['getPreferencesByUserId']>> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const now = new Date().toISOString();
    const existing = await this.preferencesRepo.findOne({
      where: { userId } as any,
    });

    const current = await this.getPreferencesByUserId(userId);
    const incomingNotifications = dto.notifications || {};
    const notifications = {
      email:
        typeof incomingNotifications.email === 'boolean'
          ? incomingNotifications.email
          : current.notifications.email,
      browser:
        typeof incomingNotifications.browser === 'boolean'
          ? incomingNotifications.browser
          : current.notifications.browser,
      taskDue:
        typeof incomingNotifications.taskDue === 'boolean'
          ? incomingNotifications.taskDue
          : current.notifications.taskDue,
      mentions:
        typeof incomingNotifications.mentions === 'boolean'
          ? incomingNotifications.mentions
          : current.notifications.mentions,
      security:
        typeof incomingNotifications.security === 'boolean'
          ? incomingNotifications.security
          : current.notifications.security,
      product:
        typeof incomingNotifications.product === 'boolean'
          ? incomingNotifications.product
          : current.notifications.product,
    };

    const theme = this.normalizeThemeMode(dto.theme);

    if (!existing) {
      await this.preferencesRepo.save({
        userId,
        theme,
        notifyEmail: notifications.email,
        notifyBrowser: notifications.browser,
        notifyTaskDue: notifications.taskDue,
        notifyMentions: notifications.mentions,
        notifySecurity: notifications.security,
        notifyProduct: notifications.product,
        updatedAt: now,
      } as any);
    } else {
      await this.preferencesRepo.update(
        { _id: existing._id } as any,
        {
          theme,
          notifyEmail: notifications.email,
          notifyBrowser: notifications.browser,
          notifyTaskDue: notifications.taskDue,
          notifyMentions: notifications.mentions,
          notifySecurity: notifications.security,
          notifyProduct: notifications.product,
          updatedAt: now,
        } as any,
      );
    }

    return this.getPreferencesByUserId(userId);
  }

  async exportUserDataByUserId(
    userId: string,
  ): Promise<Readonly<Record<string, unknown>>> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const preferences = await this.getPreferencesByUserId(userId);

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: String(user._id),
        email: user.email,
        username: user.username,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        department: user.department,
        jobTitle: user.jobTitle,
        timezone: user.timezone,
        locale: user.locale,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      },
      preferences,
      security: {
        emailVerified: !!user.emailVerified,
        twoFactorEnabled: !!user.twoFactorEnabled,
      },
      notifications: preferences.notifications,
    };
  }

  async deleteAccountByUserId(
    userId: string,
    password: string,
  ): Promise<Readonly<{ ok: boolean }>> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isPasswordValid = await bcrypt.compare(
      String(password || ''),
      String(user.passwordHash || ''),
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const suffix = `${Date.now()}_${String(user._id)}`;
    const now = new Date().toISOString();

    await this.usersRepo.update(
      { _id: user._id } as any,
      {
        email: `deleted_${suffix}@deleted.local`,
        username: `deleted_${suffix}`,
        name: 'Deleted User',
        firstName: undefined,
        lastName: undefined,
        phone: undefined,
        department: undefined,
        notes: undefined,
        avatarUrl: undefined,
        avatarStoragePath: undefined,
        avatarMimeType: undefined,
        jobTitle: undefined,
        timezone: undefined,
        locale: undefined,
        bio: undefined,
        twoFactorEnabled: false,
        twoFactorSecret: undefined,
        twoFactorTempSecret: undefined,
        twoFactorEnabledAt: undefined,
        twoFactorRecoveryCodes: [],
        roles: ['viewer'] as any,
        disabled: true,
        lockedAt: now,
        lockedReason: 'account_deleted_by_user',
        tokenVersion:
          (typeof user.tokenVersion === 'number' ? user.tokenVersion : 1) + 1,
        updatedAt: now,
      } as any,
    );

    return { ok: true };
  }

  private cleanOptionalText(value?: string, max = 255): string | undefined {
    const trimmed = String(value || '').trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, max);
  }

  private normalizeThemeMode(value?: string): ThemeMode {
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value;
    }
    return 'system';
  }

  private joinFullName(first?: string, last?: string): string | undefined {
    const merged = `${String(first || '').trim()} ${String(last || '').trim()}`
      .trim()
      .replace(/\s+/g, ' ');

    return merged || undefined;
  }

  private resolveAvatarExtension(
    mimeType: string,
    originalName: string,
  ): string {
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/webp') return 'webp';
    if (mimeType === 'image/gif') return 'gif';
    if (mimeType === 'image/jpeg') return 'jpg';

    const ext = String(originalName || '')
      .split('.')
      .pop()
      ?.toLowerCase();

    return ext || 'jpg';
  }

  private async storeAvatar(
    buffer: Buffer,
    mimeType: string,
    key: string,
  ): Promise<string> {
    const nodeEnv = String(process.env.NODE_ENV || 'development');
    const avatarMode = String(
      process.env.AVATAR_STORAGE_MODE || '',
    ).toLowerCase();
    const useS3 = avatarMode === 's3' || nodeEnv === 'production';

    if (useS3) {
      const bucket = String(process.env.AVATAR_S3_BUCKET || '').trim();
      const region = String(process.env.AVATAR_S3_REGION || '').trim();
      if (!bucket || !region) {
        throw new BadRequestException(
          'S3 avatar storage is enabled but AVATAR_S3_BUCKET/AVATAR_S3_REGION are missing',
        );
      }

      const s3 = new S3Client({ region });
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      const publicBase = String(
        process.env.AVATAR_S3_PUBLIC_BASE_URL || '',
      ).trim();
      if (publicBase) {
        return `${publicBase.replace(/\/$/, '')}/${key}`;
      }

      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }

    const absPath = path.join(this.uploadsDir, key);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, buffer);
    return '/users/me/avatar';
  }
}
