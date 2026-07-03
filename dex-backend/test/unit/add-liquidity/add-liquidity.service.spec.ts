import { Test, TestingModule } from '@nestjs/testing';

import { getModelToken } from '@nestjs/mongoose';

import { AddLiquidityService } from '../../../src/modules/add-liquidity/add-liquidity.service';

import { AddLiquidity } from '../../../src/modules/add-liquidity/schemas/add-liquidity.schema';

import { PoolsService } from '../../../src/modules/pools/pools.service';

describe('AddLiquidityService', () => {
  let service: AddLiquidityService;

  const mockCreateAddLiquidityDto = {
    poolAddress: '0x1111111111111111111111111111111111111111',

    token0Amount: '100',

    token1Amount: '200',

    walletAddress: '0x2222222222222222222222222222222222222222',

    txHash:
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',

    chainId: 1,
  };

  beforeEach(async () => {
    const fakeModel = {
      async create(data: any) {
        return data;
      },

      find() {
        return {
          sort: async () => [
            {
              txHash: '0x1',
            },
            {
              txHash: '0x2',
            },
          ],
        };
      },
    };

    const fakePoolsService = {
      async updatePoolReserves() {
        return true;
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddLiquidityService,

        {
          provide: getModelToken(AddLiquidity.name),

          useValue: fakeModel,
        },

        {
          provide: PoolsService,

          useValue: fakePoolsService,
        },
      ],
    }).compile();

    service = module.get<AddLiquidityService>(AddLiquidityService);
  });

  describe('create', () => {
    it('should create liquidity transaction successfully', async () => {
      const result = await service.create(mockCreateAddLiquidityDto);

      expect(result).toEqual({
        ...mockCreateAddLiquidityDto,

        poolAddress: '0x1111111111111111111111111111111111111111',

        walletAddress: '0x2222222222222222222222222222222222222222',

        txHash:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      });
    });

    it('should lowercase addresses and txHash', async () => {
      const result = await service.create({
        ...mockCreateAddLiquidityDto,

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
      const result = await service.create(mockCreateAddLiquidityDto);

      expect(result.token0Amount).toBe('100');

      expect(result.token1Amount).toBe('200');
    });
  });

  describe('getPoolLiquidityTransactions', () => {
    it('should return liquidity transactions', async () => {
      const result = await service.getPoolLiquidityTransactions('0xPOOL');

      expect(result).toEqual([
        {
          txHash: '0x1',
        },
        {
          txHash: '0x2',
        },
      ]);
    });
  });
});
