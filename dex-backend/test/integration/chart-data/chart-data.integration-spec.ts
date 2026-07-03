import { Test } from '@nestjs/testing';

import { INestApplication, ValidationPipe } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { MongoMemoryServer } from 'mongodb-memory-server';

import mongoose from 'mongoose';

import request from 'supertest';

import { PoolsModule } from '../../../src/modules/pools/pools.module';

import { SwapsModule } from '../../../src/modules/swaps/swaps.module';

import { TokensModule } from '../../../src/modules/tokens/tokens.module';

import { ChartDataModule } from '../../../src/modules/chart-data/chart-data.module';

jest.setTimeout(60000);

describe('Chart Data Integration', () => {
  let app: INestApplication;

  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    const mongoUri = mongoServer.getUri();

    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),

        PoolsModule,

        SwapsModule,

        TokensModule,

        ChartDataModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    const poolPayload = {
      poolAddress: '0x1111111111111111111111111111111111111111',

      token0Address: '0x2222222222222222222222222222222222222222',

      token1Address: '0x3333333333333333333333333333333333333333',

      token0Symbol: 'ETH',

      token1Symbol: 'USDT',

      creatorWallet: '0x4444444444444444444444444444444444444444',

      txHash:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',

      chainId: 1,

      feeTier: 3000,

      token0Decimals: 18,

      token1Decimals: 6,

      token0InitialAmount: '1000000000000000000',

      token1InitialAmount: '2000000000',
    };

    await request(app.getHttpServer()).post('/pools').send(poolPayload);

    const swapPayload1 = {
      walletAddress: '0x5555555555555555555555555555555555555555',

      poolAddress: '0x1111111111111111111111111111111111111111',

      tokenIn: '0x2222222222222222222222222222222222222222',

      tokenOut: '0x3333333333333333333333333333333333333333',

      amountIn: '1000000000000000000',

      amountOut: '2000000000',

      txHash:
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',

      chainId: 1,

      price: 2.0,
    };

    const swapPayload2 = {
      walletAddress: '0x6666666666666666666666666666666666666666',

      poolAddress: '0x1111111111111111111111111111111111111111',

      tokenIn: '0x2222222222222222222222222222222222222222',

      tokenOut: '0x3333333333333333333333333333333333333333',

      amountIn: '2000000000000000000',

      amountOut: '4000000000',

      txHash:
        '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',

      chainId: 1,

      price: 2.0,
    };

    await request(app.getHttpServer()).post('/swaps').send(swapPayload1);

    await request(app.getHttpServer()).post('/swaps').send(swapPayload2);
  });

  afterAll(async () => {
    await app.close();

    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('GET /chart-data/candles', () => {
    it('should generate candles successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/chart-data/candles')
        .query({
          poolAddress: '0x1111111111111111111111111111111111111111',

          timeframe: '1m',
        });

      expect(response.status).toBe(200);

      expect(Array.isArray(response.body)).toBe(true);

      expect(response.body.length).toBeGreaterThan(0);

      expect(response.body[0]).toHaveProperty('time');

      expect(response.body[0]).toHaveProperty('open');

      expect(response.body[0]).toHaveProperty('high');

      expect(response.body[0]).toHaveProperty('low');

      expect(response.body[0]).toHaveProperty('close');

      expect(response.body[0]).toHaveProperty('volume');
    });

    it('should return 404 for invalid pool', async () => {
      const response = await request(app.getHttpServer())
        .get('/chart-data/candles')
        .query({
          poolAddress: '0x9999999999999999999999999999999999999999',

          timeframe: '1m',
        });

      expect(response.status).toBe(404);

      expect(response.body.message).toBe('Pool not found');
    });

    it('should return 404 for invalid timeframe', async () => {
      const response = await request(app.getHttpServer())
        .get('/chart-data/candles')
        .query({
          poolAddress: '0x1111111111111111111111111111111111111111',

          timeframe: '100m',
        });

      expect(response.status).toBe(404);

      expect(response.body.message).toBe('Invalid timeframe');
    });

    it('should return candle data with correct values', async () => {
      const response = await request(app.getHttpServer())
        .get('/chart-data/candles')
        .query({
          poolAddress: '0x1111111111111111111111111111111111111111',

          timeframe: '1m',
        });

      expect(response.status).toBe(200);

      expect(response.body.length).toBeGreaterThan(0);

      const candle = response.body[0];

      expect(candle).toHaveProperty('time');

      expect(candle).toHaveProperty('open');

      expect(candle).toHaveProperty('high');

      expect(candle).toHaveProperty('low');

      expect(candle).toHaveProperty('close');

      expect(candle).toHaveProperty('volume');

      expect(typeof candle.time).toBe('number');

      expect(typeof candle.open).toBe('number');

      expect(typeof candle.high).toBe('number');

      expect(typeof candle.low).toBe('number');

      expect(typeof candle.close).toBe('number');

      expect(typeof candle.volume).toBe('number');

      expect(candle.high).toBeGreaterThanOrEqual(candle.low);

      expect(candle.volume).toBeGreaterThan(0);
    });
  });
});
