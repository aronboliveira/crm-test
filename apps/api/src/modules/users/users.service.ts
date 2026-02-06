import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import UserEntity from '../../entities/UserEntity';

@Injectable()
export default class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: MongoRepository<UserEntity>,
  ) {
    try {
      if (!usersRepo) {
        this.logger.error('UsersRepo not injected');
        throw new Error('Repository initialization failed');
      }
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
}
