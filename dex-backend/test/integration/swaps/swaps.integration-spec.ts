import { Test } from '@nestjs/testing';

import { INestApplication, ValidationPipe } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { MongoMemoryServer } from 'mongodb-memory-server';

import mongoose from 'mongoose';

import request from 'supertest';

import { PoolsModule } from '../../../src/modules/pools/pools.module';

import { TokensModule } from '../../../src/modules/tokens/tokens.module';

import { SwapsModule } from '../../../src/modules/swaps/swaps.module';

jest.setTimeout(60000);

describe('Swaps Integration', () => {
  let app: INestApplication;

  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    const mongoUri = mongoServer.getUri();

    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),

        PoolsModule,

        TokensModule,

        SwapsModule,
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
  });

  afterAll(async () => {
    await app.close();

    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('POST /swaps', () => {
    beforeAll(async () => {
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

        token0InitialAmount: '1000',

        token1InitialAmount: '2000',
      };

      await request(app.getHttpServer()).post('/pools').send(poolPayload);
    });

    it('should create swap successfully', async () => {
      const payload = {
        walletAddress: '0x5555555555555555555555555555555555555555',

        poolAddress: '0x1111111111111111111111111111111111111111',

        tokenIn: '0x2222222222222222222222222222222222222222',

        tokenOut: '0x3333333333333333333333333333333333333333',

        amountIn: '100',

        amountOut: '200',

        txHash:
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',

        chainId: 1,

        price: 2.0,
      };

      const response = await request(app.getHttpServer())
        .post('/swaps')
        .send(payload);

      expect(response.status).toBe(201);

      expect(response.body.walletAddress).toBe(
        payload.walletAddress.toLowerCase(),
      );

      expect(response.body.poolAddress).toBe(payload.poolAddress.toLowerCase());
    });

    it('should update pool reserves after swap', async () => {
      const response = await request(app.getHttpServer()).get(
        '/pools/0x1111111111111111111111111111111111111111',
      );

      expect(response.status).toBe(200);

      expect(response.body.currentToken0Amount).toBe('1100');

      expect(response.body.currentToken1Amount).toBe('1800');
    });

    it('should fail for invalid payload', async () => {
      const payload = {
        walletAddress: 'invalid',

        poolAddress: 'invalid',

        tokenIn: 'invalid',

        tokenOut: 'invalid',

        amountIn: '',

        amountOut: '',

        txHash: 'invalid',

        chainId: 'wrong',
      };

      const response = await request(app.getHttpServer())
        .post('/swaps')
        .send(payload);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /swaps', () => {
    it('should return all swaps', async () => {
      const response = await request(app.getHttpServer()).get('/swaps');

      expect(response.status).toBe(200);

      expect(Array.isArray(response.body)).toBe(true);

      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /swaps/wallet/:address', () => {
    it('should return swaps by wallet', async () => {
      const response = await request(app.getHttpServer()).get(
        '/swaps/wallet/0x5555555555555555555555555555555555555555',
      );

      expect(response.status).toBe(200);

      expect(Array.isArray(response.body)).toBe(true);

      expect(response.body.length).toBeGreaterThan(0);

      expect(response.body[0].walletAddress).toBe(
        '0x5555555555555555555555555555555555555555',
      );
    });

    it('should return empty array for wallet with no swaps', async () => {
      const response = await request(app.getHttpServer()).get(
        '/swaps/wallet/0x9999999999999999999999999999999999999999',
      );

      expect(response.status).toBe(200);

      expect(response.body).toEqual([]);
    });
  });
});
