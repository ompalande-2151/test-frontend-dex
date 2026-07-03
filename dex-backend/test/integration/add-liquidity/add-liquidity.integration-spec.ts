import { Test } from '@nestjs/testing';

import { INestApplication, ValidationPipe } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { MongoMemoryServer } from 'mongodb-memory-server';

import mongoose from 'mongoose';

import request from 'supertest';

import { PoolsModule } from '../../../src/modules/pools/pools.module';

import { TokensModule } from '../../../src/modules/tokens/tokens.module';

import { AddLiquidityModule } from '../../../src/modules/add-liquidity/add-liquidity.module';

jest.setTimeout(60000);

describe('Add Liquidity Integration', () => {
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

        AddLiquidityModule,
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

      token0InitialAmount: '1000',

      token1InitialAmount: '2000',
    };

    await request(app.getHttpServer()).post('/pools').send(poolPayload);
  });

  afterAll(async () => {
    await app.close();

    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('POST /add-liquidity', () => {
    it('should add liquidity successfully', async () => {
      const payload = {
        poolAddress: '0x1111111111111111111111111111111111111111',

        token0Amount: '500',

        token1Amount: '1000',

        walletAddress: '0x5555555555555555555555555555555555555555',

        txHash:
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',

        chainId: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/add-liquidity')
        .send(payload);

      expect(response.status).toBe(201);

      expect(response.body.poolAddress).toBe(payload.poolAddress.toLowerCase());

      expect(response.body.walletAddress).toBe(
        payload.walletAddress.toLowerCase(),
      );
    });

    it('should update pool reserves', async () => {
      const response = await request(app.getHttpServer()).get(
        '/pools/0x1111111111111111111111111111111111111111',
      );

      expect(response.status).toBe(200);

      expect(response.body.currentToken0Amount).toBe('1500');

      expect(response.body.currentToken1Amount).toBe('3000');
    });

    it('should fail validation for invalid payload', async () => {
      const payload = {
        poolAddress: 'invalid',

        token0Amount: '',

        token1Amount: '',

        walletAddress: 'invalid',

        txHash: '',

        chainId: 'wrong',
      };

      const response = await request(app.getHttpServer())
        .post('/add-liquidity')
        .send(payload);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /add-liquidity/:poolAddress', () => {
    it('should return liquidity transactions', async () => {
      const response = await request(app.getHttpServer()).get(
        '/add-liquidity/0x1111111111111111111111111111111111111111',
      );

      expect(response.status).toBe(200);

      expect(Array.isArray(response.body)).toBe(true);

      expect(response.body.length).toBeGreaterThan(0);

      expect(response.body[0].poolAddress).toBe(
        '0x1111111111111111111111111111111111111111',
      );
    });

    it('should return empty array for pool with no liquidity history', async () => {
      const response = await request(app.getHttpServer()).get(
        '/add-liquidity/0x9999999999999999999999999999999999999999',
      );

      expect(response.status).toBe(200);

      expect(response.body).toEqual([]);
    });
  });
});
