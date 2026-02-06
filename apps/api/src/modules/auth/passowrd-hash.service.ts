import { Injectable, Logger } from '@nestjs/common';
import bcrypt from 'bcryptjs';

@Injectable()
export default class PasswordHashService {
  private readonly logger = new Logger(PasswordHashService.name);
  private static readonly ROUNDS = 12;

  constructor() {
    try {
      this.logger.log('PasswordHashService initialized');
    } catch (error) {
      this.logger.error('PasswordHashService constructor error:', error);
      throw error;
    }
  }

  async hash(raw: string): Promise<string> {
    try {
      const s = String(raw || '');
      if (!s) {
        throw new Error('Cannot hash empty string');
      }
      return await bcrypt.hash(s, PasswordHashService.ROUNDS);
    } catch (error) {
      this.logger.error('Error hashing password:', error);
      throw error;
    }
  }

  async compare(raw: string, hashed: string): Promise<boolean> {
    try {
      const a = String(raw || '');
      const b = String(hashed || '');
      if (!a || !b) {
        return false;
      }
      return await bcrypt.compare(a, b);
    } catch (error) {
      this.logger.error('Error comparing password:', error);
      return false;
    }
  }
}
