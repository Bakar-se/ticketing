import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  for (const name of ['DATABASE_URL', 'AUTH_URL', 'REDIS_URL'] as const) {
    if (!process.env[name]) {
      throw new Error(`missing ${name}`);
    }
  }

  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();