import { Module, Logger } from '@nestjs/common';

/**
 * Redis Cache Module — Skeleton
 *
 * TODO (Production):
 *   1. npm install cache-manager cache-manager-ioredis-yet ioredis
 *   2. Uncomment the CacheModule.registerAsync below
 *   3. Inject CACHE_MANAGER in services that need caching
 *   4. Use @Cacheable() or cacheManager.get/set/del
 *
 * For now this module is a no-op placeholder so the app boots
 * without requiring a running Redis instance.
 */

// Uncomment when Redis is running in Docker:
// import { CacheModule } from '@nestjs/cache-manager';
// import { redisStore } from 'cache-manager-ioredis-yet';

@Module({
  imports: [
    // CacheModule.registerAsync({
    //   isGlobal: true,
    //   useFactory: async () => ({
    //     store: await redisStore({
    //       host: process.env.REDIS_HOST || 'redis',
    //       port: Number(process.env.REDIS_PORT) || 6379,
    //       ttl: 60_000, // default 60 s
    //     }),
    //   }),
    // }),
  ],
})
export default class RedisCacheModule {
  private readonly logger = new Logger(RedisCacheModule.name);

  constructor() {
    this.logger.log(
      'RedisCacheModule loaded (skeleton — Redis integration commented out)',
    );
    this.logger.log(
      `REDIS_HOST=${process.env.REDIS_HOST || '(not set)'}, REDIS_PORT=${process.env.REDIS_PORT || '(not set)'}`,
    );
  }
}
