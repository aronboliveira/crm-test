import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import UsersService from './users.service';
import JwtAuthGuard from '../auth/guards/jwt-auth.guard';
import PermissionsGuard from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import type { ThemeMode } from '../../entities/UserPreferencesEntity';

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

type DeleteAccountDto = Readonly<{
  password: string;
}>;

@Controller('/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly s: UsersService) {
    try {
      if (!s) {
        this.logger.error('UsersService not injected');
        throw new Error('Service initialization failed');
      }
      this.logger.log('UsersController initialized');
    } catch (error) {
      this.logger.error('UsersController constructor error:', error);
      throw error;
    }
  }

  @Get()
  @Permissions('users.read')
  async list() {
    try {
      const rows = await this.s.list();
      return rows.map((u) => ({
        id: String(u._id),
        email: u.email,
        username: u.username,
        roles: u.roles,
        disabled: u.disabled,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));
    } catch (error) {
      this.logger.error('Error in list endpoint:', error);
      throw error;
    }
  }

  @Get('/me')
  async me(@Req() req: any) {
    try {
      if (!req.user) {
        this.logger.warn('No user found in request');
        return null;
      }
      return req.user;
    } catch (error) {
      this.logger.error('Error in me endpoint:', error);
      throw error;
    }
  }

  @Get('/me/profile')
  async profile(@Req() req: any) {
    try {
      const userId = String(req?.user?.id || '').trim();
      return await this.s.getProfileByUserId(userId);
    } catch (error) {
      this.logger.error('Error in profile endpoint:', error);
      throw error;
    }
  }

  @Patch('/me/profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    try {
      const userId = String(req?.user?.id || '').trim();
      return await this.s.updateProfileByUserId(userId, dto);
    } catch (error) {
      this.logger.error('Error in updateProfile endpoint:', error);
      throw error;
    }
  }

  @Post('/me/avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  async uploadAvatar(@Req() req: any, @UploadedFile() file: any) {
    try {
      const userId = String(req?.user?.id || '').trim();
      return await this.s.uploadAvatarByUserId(userId, file);
    } catch (error) {
      this.logger.error('Error in uploadAvatar endpoint:', error);
      throw error;
    }
  }

  @Get('/me/avatar')
  async getAvatar(@Req() req: any, @Res() res: Response) {
    try {
      const userId = String(req?.user?.id || '').trim();
      const payload = await this.s.getAvatarByUserId(userId);

      if (payload.mode === 'redirect' && payload.url) {
        return res.redirect(payload.url);
      }

      if (payload.mode === 'buffer' && payload.buffer) {
        res.set({
          'Content-Type': payload.mimeType || 'application/octet-stream',
          'Content-Length': payload.buffer.length.toString(),
          'Cache-Control': 'private, max-age=60',
        });
        return res.send(payload.buffer);
      }

      return res.status(404).send('Avatar not found');
    } catch (error) {
      this.logger.error('Error in getAvatar endpoint:', error);
      throw error;
    }
  }

  @Get('/me/preferences')
  async preferences(@Req() req: any) {
    try {
      const userId = String(req?.user?.id || '').trim();
      return await this.s.getPreferencesByUserId(userId);
    } catch (error) {
      this.logger.error('Error in preferences endpoint:', error);
      throw error;
    }
  }

  @Patch('/me/preferences')
  async updatePreferences(@Req() req: any, @Body() dto: UpdatePreferencesDto) {
    try {
      const userId = String(req?.user?.id || '').trim();
      return await this.s.updatePreferencesByUserId(userId, dto);
    } catch (error) {
      this.logger.error('Error in updatePreferences endpoint:', error);
      throw error;
    }
  }

  @Get('/me/export')
  async exportMyData(@Req() req: any) {
    try {
      const userId = String(req?.user?.id || '').trim();
      return await this.s.exportUserDataByUserId(userId);
    } catch (error) {
      this.logger.error('Error in exportMyData endpoint:', error);
      throw error;
    }
  }

  @Delete('/me')
  async deleteMyAccount(@Req() req: any, @Body() dto: DeleteAccountDto) {
    try {
      const userId = String(req?.user?.id || '').trim();
      const password = String(dto?.password || '');
      return await this.s.deleteAccountByUserId(userId, password);
    } catch (error) {
      this.logger.error('Error in deleteMyAccount endpoint:', error);
      throw error;
    }
  }
}
