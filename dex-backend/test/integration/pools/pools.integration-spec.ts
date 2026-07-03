import { Test } from '@nestjs/testing';

import { INestApplication, ValidationPipe } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { MongoMemoryServer } from 'mongodb-memory-server';

import mongoose from 'mongoose';

import request from 'supertest';

jest.setTimeout(30000);

import { PoolsModule } from '../../../src/modules/pools/pools.module';

import { TokensModule } from '../../../src/modules/tokens/tokens.module';

describe('Pools Integration', () => {
  let app: INestApplication;

  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    const mongoUri = mongoServer.getUri();

    const moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), PoolsModule, TokensModule],
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

  // afterAll(async () => {
  //     await mongoose.connection.close();

  //     if (mongoServer) {
  //         await mongoServer.stop();
  //     }
  //     await app.close();
  // });

  afterAll(async () => {
    await app.close();

    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('POST /pools', () => {
    it('should create pool successfully', async () => {
      const payload = {
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

      const response = await request(app.getHttpServer())
        .post('/pools')
        .send(payload);

      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);

      expect(response.body.message).toBe('Pool created successfully');

      expect(response.body.data.poolAddress).toBe(
        payload.poolAddress.toLowerCase(),
      );
    });

    it('should prevent duplicate pool creation', async () => {
      const payload = {
        poolAddress: '0x5555555555555555555555555555555555555555',

        token0Address: '0x6666666666666666666666666666666666666666',

        token1Address: '0x7777777777777777777777777777777777777777',

        token0Symbol: 'BTC',

        token1Symbol: 'USDC',

        creatorWallet: '0x8888888888888888888888888888888888888888',

        txHash:
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',

        chainId: 1,

        feeTier: 3000,

        token0Decimals: 18,

        token1Decimals: 6,

        token0InitialAmount: '500',

        token1InitialAmount: '1000',
      };

      await request(app.getHttpServer()).post('/pools').send(payload);

      const response = await request(app.getHttpServer())
        .post('/pools')
        .send(payload);

      expect(response.status).toBe(201);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Pool Already Exist');
    });

    it('should fail validation for invalid addresses', async () => {
      const payload = {
        poolAddress: 'invalid-address',

        token0Address: 'invalid',

        token1Address: 'invalid',

        token0Symbol: 'ETH',

        token1Symbol: 'USDT',

        creatorWallet: 'invalid',

        txHash: 'invalid',

        chainId: 1,

        feeTier: 3000,

        token0Decimals: 18,

        token1Decimals: 6,

        token0InitialAmount: '1000',

        token1InitialAmount: '2000',
      };

      const response = await request(app.getHttpServer())
        .post('/pools')
        .send(payload);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /pools', () => {
    it('should return all pools', async () => {
      const response = await request(app.getHttpServer()).get('/pools');

      expect(response.status).toBe(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /pools/:address', () => {
    it('should return pool by address', async () => {
      const address = '0x1111111111111111111111111111111111111111';

      const response = await request(app.getHttpServer()).get(
        `/pools/${address}`,
      );

      expect(response.status).toBe(200);

      expect(response.body.poolAddress).toBe(address.toLowerCase());
    });

    it('should return null for non-existing pool', async () => {
      const response = await request(app.getHttpServer()).get(
        '/pools/0x9999999999999999999999999999999999999999',
      );

      expect(response.status).toBe(200);

      expect(response.body).toEqual({});
    });
  });
});
