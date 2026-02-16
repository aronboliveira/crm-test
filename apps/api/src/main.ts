import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AssistantWsService } from './modules/assistant/assistant-ws.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  try {
    const app = await NestFactory.create(AppModule, { cors: false });
    const assistantWs = app.get(AssistantWsService, { strict: false });

    const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';

    if (!origin) {
      logger.warn('CORS_ORIGIN not set, using default');
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
    assistantWs.bind(app.getHttpServer());
    logger.log(`Application listening on port ${port}`);
  } catch (e) {
    const logger = new Logger('Bootstrap');
    logger.error('Bootstrap failed', e instanceof Error ? e.stack : e);
    throw e;
  }
}

bootstrap().catch((e) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled bootstrap error', e instanceof Error ? e.stack : e);
  process.exit(1);
});
