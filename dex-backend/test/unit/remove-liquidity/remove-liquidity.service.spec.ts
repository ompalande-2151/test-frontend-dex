import { Test } from '@nestjs/testing';

import { getModelToken } from '@nestjs/mongoose';

import { RemoveLiquidityService } from '../../../src/modules/remove-liquidity/remove-liquidity.service';

import { RemoveLiquidity } from '../../../src/modules/remove-liquidity/schemas/remove-liquidity.schema';

import { PoolsService } from '../../../src/modules/pools/pools.service';

describe('RemoveLiquidityService', () => {
  let service: RemoveLiquidityService;

  let pool = {
    token0Reserve: 500,

    token1Reserve: 1000,
  };

  const createRemoveLiquidityData = {
    poolAddress: '0x1111111111111111111111111111111111111111',

    token0Amount: '100',

    token1Amount: '200',

    walletAddress: '0x2222222222222222222222222222222222222222',

    txHash:
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',

    chainId: 1,
  };

  beforeEach(async () => {
    pool = {
      token0Reserve: 500,

      token1Reserve: 1000,
    };

    const fakeRemoveLiquidityModel = {
      transactions: [] as any[],

      async create(data: any) {
        const newTransaction = {
          ...data,
        };

        this.transactions.push(newTransaction);

        return newTransaction;
      },

      find(query: any) {
        return {
          async sort() {
            return fakeRemoveLiquidityModel.transactions.filter(
              (transaction) => transaction.poolAddress === query.poolAddress,
            );
          },
        };
      },
    };

    const fakePoolsService = {
      async updatePoolReserves(
        poolAddress: string,
        token0Amount: string | number,
        token1Amount: string | number,
      ) {
        pool.token0Reserve = pool.token0Reserve + Number(token0Amount);

        pool.token1Reserve = pool.token1Reserve + Number(token1Amount);

        return pool;
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        RemoveLiquidityService,

        {
          provide: getModelToken(RemoveLiquidity.name),

          useValue: fakeRemoveLiquidityModel,
        },

        {
          provide: PoolsService,

          useValue: fakePoolsService,
        },
      ],
    }).compile();

    service = module.get<RemoveLiquidityService>(RemoveLiquidityService);
  });

  it('should create remove liquidity transaction successfully', async () => {
    const result = await service.create(createRemoveLiquidityData);

    expect(result).toEqual({
      ...createRemoveLiquidityData,

      poolAddress: '0x1111111111111111111111111111111111111111',

      walletAddress: '0x2222222222222222222222222222222222222222',

      txHash:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
  });

  it('should lowercase addresses and txHash', async () => {
    const result = await service.create({
      ...createRemoveLiquidityData,

      poolAddress: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

      walletAddress: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',

      txHash:
        '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    });

    expect(result.poolAddress).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );

    expect(result.walletAddress).toBe(
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );

    expect(result.txHash).toBe(
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    );
  });

  it('should keep token amounts correctly', async () => {
    const result = await service.create(createRemoveLiquidityData);

    expect(result.token0Amount).toBe('100');

    expect(result.token1Amount).toBe('200');
  });

  it('should reduce pool reserves correctly', async () => {
    await service.create(createRemoveLiquidityData);

    expect(pool.token0Reserve).toBe(400);

    expect(pool.token1Reserve).toBe(800);
  });

  it('should return remove liquidity transactions of pool', async () => {
    await service.create(createRemoveLiquidityData);

    await service.create({
      ...createRemoveLiquidityData,

      txHash:
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    });

    const result = await service.getPoolRemoveLiquidityTransactions(
      '0x1111111111111111111111111111111111111111',
    );

    const expectedResult = [
      {
        ...createRemoveLiquidityData,

        poolAddress: '0x1111111111111111111111111111111111111111',

        walletAddress: '0x2222222222222222222222222222222222222222',

        txHash:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },

      {
        ...createRemoveLiquidityData,

        poolAddress: '0x1111111111111111111111111111111111111111',

        walletAddress: '0x2222222222222222222222222222222222222222',

        txHash:
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      },
    ];

    expect(result).toEqual(expectedResult);
  });

  it('should return empty array if pool has no transactions', async () => {
    const result = await service.getPoolRemoveLiquidityTransactions(
      '0x9999999999999999999999999999999999999999',
    );

    expect(result).toEqual([]);
  });
});
