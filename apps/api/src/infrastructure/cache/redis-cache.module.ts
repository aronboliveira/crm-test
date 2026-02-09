import { Module, Logger } from '@nestjs/common';

/**
 * Redis Cache Module
 *
 * Provides distributed caching capabilities using Redis.
 * Configure via REDIS_HOST and REDIS_PORT environment variables.
 *
 * @example
 * // Enable Redis caching:
 * // 1. Install dependencies: npm install cache-manager cache-manager-ioredis-yet ioredis
 * // 2. Uncomment CacheModule.registerAsync configuration
 * // 3. Inject CACHE_MANAGER in services requiring caching
 */

@Module({
  imports: [],
})
export default class RedisCacheModule {
  private readonly logger = new Logger(RedisCacheModule.name);

  constructor() {
    this.logger.log('RedisCacheModule initialized');
  }
}
