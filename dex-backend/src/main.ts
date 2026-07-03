import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('DEX Backend API')
    .setDescription('DEX Backend APIs documentation')
    .setVersion('1.0')
    .addTag('Pools', 'Pool management and liquidity operations')
    .addTag('Swaps', 'Token swap operations')
    .addTag('Chart Data', 'OHLC candle data for price charts')
    .addTag('Tokens', 'Token information and management')
    .addTag('Add Liquidity', 'Add liquidity transactions')
    .addTag('Remove Liquidity', 'Remove liquidity transactions')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(5000);

  console.log(`Server running on port 5000`);
  console.log(`Swagger documentation available at http://localhost:5000/api`);
}

void bootstrap();
