import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, { cors: false });

    const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';

    if (!origin) {
      console.warn('[api] bootstrap: CORS_ORIGIN not set, using default');
    }

    app.enableCors({
      origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    const port = Number(process.env.PORT || 3000);

    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port: ${port}`);
    }

    await app.listen(port);
    console.log(`[api] Application listening on port ${port}`);
  } catch (e) {
    console.error('[api] bootstrap failed:', e);
    throw e;
  }
}

bootstrap().catch((e) => {
  console.error('[api] bootstrap unhandled error:', e);
  process.exit(1);
});
