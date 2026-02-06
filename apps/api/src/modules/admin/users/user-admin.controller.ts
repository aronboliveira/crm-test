import {
  Controller,
  Get,
  Param,
  Query,
  Patch,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { Permissions } from '../../rbac/permissions.decorator';
import UserAdminService from './user-admin.service';

interface QueryParams {
  limit?: string;
  skip?: string;
  sort?: string;
}

interface SetRoleBody {
  roleKey: string;
}

interface LockBody {
  reason?: string;
}

interface CreateUserBody {
  email: string;
  roleKey?: string;
}

@Controller('/admin/users')
export default class UserAdminController {
  constructor(private readonly s: UserAdminService) {}

  @Get('/')
  @Permissions('users.manage')
  async list(@Query() q: QueryParams) {
    try {
      return await this.s.list(q);
    } catch (error) {
      throw error;
    }
  }

  @Get('/:id')
  @Permissions('users.manage')
  async details(@Param('id') id: string) {
    try {
      return await this.s.details(id);
    } catch (error) {
      throw error;
    }
  }

  @Patch('/:id/role')
  @Permissions('users.manage')
  async setRole(
    @Param('id') id: string,
    @Body() body: SetRoleBody,
    @Req() req: any,
  ) {
    const actor = {
      userId: String(req.user?.id || ''),
      email: String(req.user?.email || ''),
    };
    const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || '');
    const ua = String(req?.headers?.['user-agent'] || '');
    return this.s.setRole(actor, id, body?.roleKey, { ip, ua });
  }

  @Post('/:id/force-reset')
  @Permissions('users.manage')
  async forceReset(@Param('id') id: string, @Req() req: any) {
    const actor = {
      userId: String(req.user?.id || ''),
      email: String(req.user?.email || ''),
    };
    const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || '');
    const ua = String(req?.headers?.['user-agent'] || '');
    return this.s.forceReset(actor, id, { ip, ua });
  }

  @Post('/:id/lock')
  @Permissions('users.manage')
  async lock(@Param('id') id: string, @Body() body: LockBody, @Req() req: any) {
    const actor = {
      userId: String(req.user?.id || ''),
      email: String(req.user?.email || ''),
    };
    const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || '');
    const ua = String(req?.headers?.['user-agent'] || '');
    return this.s.lockUser(actor, id, body?.reason, { ip, ua });
  }

  @Post('/:id/unlock')
  @Permissions('users.manage')
  async unlock(@Param('id') id: string, @Req() req: any) {
    const actor = {
      userId: String(req.user?.id || ''),
      email: String(req.user?.email || ''),
    };
    const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || '');
    const ua = String(req?.headers?.['user-agent'] || '');
    return this.s.unlockUser(actor, id, { ip, ua });
  }

  @Post('/')
  @Permissions('users.manage')
  async create(@Body() body: CreateUserBody, @Req() req: any) {
    const actor = {
      userId: String(req.user?.id || ''),
      email: String(req.user?.email || ''),
    };
    const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || '');
    const ua = String(req?.headers?.['user-agent'] || '');
    return this.s.createUser(actor, body, { ip, ua });
  }

  @Post('/:id/reissue-invite')
  @Permissions('users.manage')
  async reissueInvite(@Param('id') id: string, @Req() req: any) {
    const actor = {
      userId: String(req.user?.id || ''),
      email: String(req.user?.email || ''),
    };
    const ip = String(req?.ip || req?.headers?.['x-forwarded-for'] || '');
    const ua = String(req?.headers?.['user-agent'] || '');
    return this.s.reissueInvite(actor, id, { ip, ua });
  }
}
