import { Test } from '@nestjs/testing';

import { getModelToken } from '@nestjs/mongoose';

import { NotFoundException } from '@nestjs/common';

import { ChartDataService } from '../../../src/modules/chart-data/chart-data.service';

import { Swap } from '../../../src/modules/swaps/schemas/swap.schema';

import { Pool } from '../../../src/modules/pools/schemas/pool.schema';

import { Token } from '../../../src/modules/tokens/schemas/token.schema';

describe('ChartDataService', () => {
  let service: ChartDataService;

  beforeEach(async () => {
    const storedSwaps: any[] = [];

    const storedPools = [
      {
        poolAddress: '0xpool',

        token0Address: '0xtoken0',

        token1Address: '0xtoken1',
      },
    ];

    const storedTokens = [
      {
        tokenAddress: '0xtoken0',

        decimals: 6,
      },

      {
        tokenAddress: '0xtoken1',

        decimals: 6,
      },
    ];

    const fakeSwapModel = {
      swaps: storedSwaps,

      find() {
        return {
          async sort() {
            return storedSwaps;
          },
        };
      },
    };

    const fakePoolModel = {
      async findOne(query: any) {
        const foundPool = storedPools.find(
          (pool) => pool.poolAddress === query.poolAddress,
        );

        return foundPool || null;
      },
    };

    const fakeTokenModel = {
      async findOne(query: any) {
        const foundToken = storedTokens.find(
          (token) => token.tokenAddress === query.tokenAddress,
        );

        return foundToken || null;
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        ChartDataService,

        {
          provide: getModelToken(Swap.name),

          useValue: fakeSwapModel,
        },

        {
          provide: getModelToken(Pool.name),

          useValue: fakePoolModel,
        },

        {
          provide: getModelToken(Token.name),

          useValue: fakeTokenModel,
        },
      ],
    }).compile();

    service = module.get<ChartDataService>(ChartDataService);

    (service as any).swapModel = fakeSwapModel;
  });

  it('should generate candle correctly from swap data', async () => {
    (service as any).swapModel.swaps.push({
      amountIn: '1000000',

      amountOut: '2000000',

      tokenIn: '0xtoken0',

      price: 2,

      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    const result = await service.getCandles('0xpool', '1m');

    expect(result.length).toBe(1);

    expect(result[0].open).toBe(2);

    expect(result[0].high).toBe(2);

    expect(result[0].low).toBe(2);

    expect(result[0].close).toBe(2);

    expect(result[0].volume).toBe(2000000);
  });

  it('should update candle high low close correctly', async () => {
    (service as any).swapModel.swaps.push(
      {
        amountIn: '1000000',

        amountOut: '2000000',

        tokenIn: '0xtoken0',

        price: 2,

        createdAt: new Date('2025-01-01T00:00:10Z'),
      },

      {
        amountIn: '1000000',

        amountOut: '3000000',

        tokenIn: '0xtoken0',

        price: 3,

        createdAt: new Date('2025-01-01T00:00:20Z'),
      },
    );

    const result = await service.getCandles('0xpool', '1m');

    expect(result.length).toBe(1);

    expect(result[0].open).toBe(2);

    expect(result[0].high).toBe(3);

    expect(result[0].low).toBe(2);

    expect(result[0].close).toBe(3);

    expect(result[0].volume).toBe(5000000);
  });

  it('should calculate reverse token price correctly', async () => {
    (service as any).swapModel.swaps.push({
      amountIn: '2000000',

      amountOut: '1000000',

      tokenIn: '0xtoken1',

      price: 2,

      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    const result = await service.getCandles('0xpool', '1m');

    expect(result[0].open).toBe(2);

    expect(result[0].close).toBe(2);
  });

  it('should return empty array if swaps not found', async () => {
    const result = await service.getCandles('0xpool', '1m');

    expect(result).toEqual([]);
  });

  it('should throw error if pool not found', async () => {
    try {
      await service.getCandles('0xwrongpool', '1m');
    } catch (error: any) {
      expect(error instanceof NotFoundException).toBe(true);

      expect(error.message).toBe('Pool not found');
    }
  });

  it('should throw error if token not found', async () => {
    const fakeTokenModel = {
      async findOne() {
        return null;
      },
    };

    (service as any).tokenModel = fakeTokenModel;

    try {
      await service.getCandles('0xpool', '1m');
    } catch (error: any) {
      expect(error instanceof NotFoundException).toBe(true);

      expect(error.message).toBe('Tokens not found');
    }
  });

  it('should throw error for invalid timeframe', async () => {
    try {
      await service.getCandles('0xpool', '10m');
    } catch (error: any) {
      expect(error.message).toBe('Invalid timeframe');
    }
  });
});
