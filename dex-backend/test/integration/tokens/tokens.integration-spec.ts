import { Test } from '@nestjs/testing';

import { INestApplication, ValidationPipe } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { MongoMemoryServer } from 'mongodb-memory-server';

import mongoose from 'mongoose';

import request from 'supertest';

import { PoolsModule } from '../../../src/modules/pools/pools.module';

import { TokensModule } from '../../../src/modules/tokens/tokens.module';

jest.setTimeout(60000);

describe('Tokens Integration', () => {
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

  describe('GET /tokens', () => {
    it('should return all registered tokens', async () => {
      const response = await request(app.getHttpServer()).get('/tokens');

      expect(response.status).toBe(200);

      expect(Array.isArray(response.body)).toBe(true);

      expect(response.body.length).toBe(2);

      expect(response.body[0]).toHaveProperty('tokenAddress');

      expect(response.body[0]).toHaveProperty('symbol');
    });
  });

  describe('GET /tokens/:address', () => {
    it('should return token by address', async () => {
      const response = await request(app.getHttpServer()).get(
        '/tokens/0x2222222222222222222222222222222222222222',
      );

      expect(response.status).toBe(200);

      expect(response.body.tokenAddress).toBe(
        '0x2222222222222222222222222222222222222222',
      );

      expect(response.body.symbol).toBe('ETH');

      expect(response.body.chainId).toBe(1);
    });

    it('should return empty object for non-existing token', async () => {
      const response = await request(app.getHttpServer()).get(
        '/tokens/0x9999999999999999999999999999999999999999',
      );

      expect(response.status).toBe(200);

      expect(response.body).toEqual({});
    });
  });
});
