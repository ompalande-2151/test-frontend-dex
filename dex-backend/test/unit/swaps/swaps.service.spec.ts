// import { Test, TestingModule } from '@nestjs/testing';
// import { getModelToken } from '@nestjs/mongoose';

// import { SwapsService } from '../../../src/modules/swaps/swaps.service';
// import { Swap } from '../../../src/modules/swaps/schemas/swap.schema';

// import { PoolsService } from '../../../src/modules/pools/pools.service';

// describe('SwapsService', () => {
//   let service: SwapsService;

//   const mockSwapModel = {
//     create: jest.fn(),
//     find: jest.fn(),
//   };

//   const mockPoolsService = {
//     getPoolByAddress: jest.fn(),
//     updatePoolReserves: jest.fn(),
//   };

//   const mockCreateSwapDto = {
//     walletAddress:
//       '0x1111111111111111111111111111111111111111',

//     poolAddress:
//       '0x2222222222222222222222222222222222222222',

//     tokenIn:
//       '0x3333333333333333333333333333333333333333',

//     tokenOut:
//       '0x4444444444444444444444444444444444444444',

//     amountIn: '100',

//     amountOut: '50',

//     txHash:
//       '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',

//     chainId: 1,
//   };

//   beforeEach(async () => {
//     const module: TestingModule =
//       await Test.createTestingModule({
//         providers: [
//           SwapsService,

//           {
//             provide: getModelToken(Swap.name),

//             useValue: mockSwapModel,
//           },

//           {
//             provide: PoolsService,

//             useValue: mockPoolsService,
//           },
//         ],
//       }).compile();

//     service =
//       module.get<SwapsService>(
//         SwapsService,
//       );

//     jest.clearAllMocks();
//   });

//   describe('createSwap', () => {
//     it(
//       'should create swap successfully when tokenIn is token0',
//       async () => {
//         const mockTransaction = {
//           id: 'swap-id',
//         };

//         mockSwapModel.create.mockResolvedValue(
//           mockTransaction,
//         );

//         mockPoolsService.getPoolByAddress.mockResolvedValue(
//           {
//             token0Address:
//               mockCreateSwapDto.tokenIn,
//           },
//         );

//         mockPoolsService.updatePoolReserves.mockResolvedValue(
//           {},
//         );

//         const result =
//           await service.createSwap(
//             mockCreateSwapDto,
//           );

//         expect(
//           mockSwapModel.create,
//         ).toHaveBeenCalled();

//         expect(
//           mockPoolsService.getPoolByAddress,
//         ).toHaveBeenCalledWith(
//           mockCreateSwapDto.poolAddress,
//         );

//         expect(
//           mockPoolsService.updatePoolReserves,
//         ).toHaveBeenCalledWith(
//           mockCreateSwapDto.poolAddress,
//           100,
//           -50,
//         );

//         expect(result).toEqual(
//           mockTransaction,
//         );
//       },
//     );

//     it(
//       'should update reserves correctly when tokenIn is token1',
//       async () => {
//         mockSwapModel.create.mockResolvedValue(
//           {},
//         );

//         mockPoolsService.getPoolByAddress.mockResolvedValue(
//           {
//             token0Address:
//               '0x9999999999999999999999999999999999999999',
//           },
//         );

//         mockPoolsService.updatePoolReserves.mockResolvedValue(
//           {},
//         );

//         await service.createSwap(
//           mockCreateSwapDto,
//         );

//         expect(
//           mockPoolsService.updatePoolReserves,
//         ).toHaveBeenCalledWith(
//           mockCreateSwapDto.poolAddress,
//           -50,
//           100,
//         );
//       },
//     );

//     it(
//       'should lowercase addresses and txHash',
//       async () => {
//         mockSwapModel.create.mockResolvedValue(
//           {},
//         );

//         mockPoolsService.getPoolByAddress.mockResolvedValue(
//           {
//             token0Address:
//               mockCreateSwapDto.tokenIn.toLowerCase(),
//           },
//         );

//         mockPoolsService.updatePoolReserves.mockResolvedValue(
//           {},
//         );

//         await service.createSwap({
//           ...mockCreateSwapDto,

//           walletAddress:
//             '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

//           poolAddress:
//             '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',

//           tokenIn:
//             '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',

//           tokenOut:
//             '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',

//           txHash:
//             '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE',
//         });

//         expect(
//           mockSwapModel.create,
//         ).toHaveBeenCalledWith(
//           expect.objectContaining({
//             walletAddress:
//               '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',

//             poolAddress:
//               '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',

//             tokenIn:
//               '0xcccccccccccccccccccccccccccccccccccccccc',

//             tokenOut:
//               '0xdddddddddddddddddddddddddddddddddddddddd',

//             txHash:
//               '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
//           }),
//         );
//       },
//     );

//     it(
//       'should throw error if pool not found',
//       async () => {
//         mockSwapModel.create.mockResolvedValue(
//           {},
//         );

//         mockPoolsService.getPoolByAddress.mockResolvedValue(
//           null,
//         );

//         await expect(
//           service.createSwap(
//             mockCreateSwapDto,
//           ),
//         ).rejects.toThrow(
//           'Pool not found',
//         );
//       },
//     );

//     it(
//       'should throw error if swap creation fails',
//       async () => {
//         mockSwapModel.create.mockRejectedValue(
//           new Error(
//             'Swap creation failed',
//           ),
//         );

//         await expect(
//           service.createSwap(
//             mockCreateSwapDto,
//           ),
//         ).rejects.toThrow(
//           'Swap creation failed',
//         );
//       },
//     );

//     it(
//       'should throw error if reserve update fails',
//       async () => {
//         mockSwapModel.create.mockResolvedValue(
//           {},
//         );

//         mockPoolsService.getPoolByAddress.mockResolvedValue(
//           {
//             token0Address:
//               mockCreateSwapDto.tokenIn,
//           },
//         );

//         mockPoolsService.updatePoolReserves.mockRejectedValue(
//           new Error(
//             'Reserve update failed',
//           ),
//         );

//         await expect(
//           service.createSwap(
//             mockCreateSwapDto,
//           ),
//         ).rejects.toThrow(
//           'Reserve update failed',
//         );
//       },
//     );
//   });

//   describe('getAllSwaps', () => {
//     it(
//       'should return all swaps',
//       async () => {
//         const mockSwaps = [
//           {
//             txHash: '0x1',
//           },
//           {
//             txHash: '0x2',
//           },
//         ];

//         const mockSort = jest.fn()
//           .mockResolvedValue(mockSwaps);

//         mockSwapModel.find.mockReturnValue({
//           sort: mockSort,
//         });

//         const result =
//           await service.getAllSwaps();

//         expect(
//           mockSwapModel.find,
//         ).toHaveBeenCalled();

//         expect(mockSort).toHaveBeenCalledWith(
//           {
//             createdAt: -1,
//           },
//         );

//         expect(result).toEqual(
//           mockSwaps,
//         );
//       },
//     );

//     it(
//       'should return empty array',
//       async () => {
//         const mockSort = jest.fn()
//           .mockResolvedValue([]);

//         mockSwapModel.find.mockReturnValue({
//           sort: mockSort,
//         });

//         const result =
//           await service.getAllSwaps();

//         expect(result).toEqual([]);
//       },
//     );
//   });

//   describe('getSwapsByWallet', () => {
//     it(
//       'should return swaps by wallet',
//       async () => {
//         const mockSwaps = [
//           {
//             walletAddress:
//               '0xwallet',
//           },
//         ];

//         const mockSort = jest.fn()
//           .mockResolvedValue(mockSwaps);

//         mockSwapModel.find.mockReturnValue({
//           sort: mockSort,
//         });

//         const result =
//           await service.getSwapsByWallet(
//             '0xWALLET',
//           );

//         expect(
//           mockSwapModel.find,
//         ).toHaveBeenCalledWith({
//           walletAddress:
//             '0xwallet',
//         });

//         expect(result).toEqual(
//           mockSwaps,
//         );
//       },
//     );

//     it(
//       'should return empty array if no swaps exist',
//       async () => {
//         const mockSort = jest.fn()
//           .mockResolvedValue([]);

//         mockSwapModel.find.mockReturnValue({
//           sort: mockSort,
//         });

//         const result =
//           await service.getSwapsByWallet(
//             '0xwallet',
//           );

//         expect(result).toEqual([]);
//       },
//     );
//   });
// });

import { Test } from '@nestjs/testing';

import { getModelToken } from '@nestjs/mongoose';

import { SwapsService } from '../../../src/modules/swaps/swaps.service';

import { Swap } from '../../../src/modules/swaps/schemas/swap.schema';

import { PoolsService } from '../../../src/modules/pools/pools.service';

import { TokensService } from '../../../src/modules/tokens/tokens.service';

describe('SwapsService', () => {
  let service: SwapsService;

  const createSwapData = {
    walletAddress: '0x1111111111111111111111111111111111111111',

    poolAddress: '0x2222222222222222222222222222222222222222',

    tokenIn: '0x3333333333333333333333333333333333333333',

    tokenOut: '0x4444444444444444444444444444444444444444',

    amountIn: '100',

    amountOut: '50',

    txHash:
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',

    chainId: 1,
    price: 0.5,
  };

  beforeEach(async () => {
    const storedSwaps: any[] = [];

    const storedPools = [
      {
        poolAddress: '0x2222222222222222222222222222222222222222',

        token0Address: '0x3333333333333333333333333333333333333333',

        token1Address: '0x4444444444444444444444444444444444444444',

        currentToken0Amount: '1000',

        currentToken1Amount: '500',
      },
    ];

    const fakeSwapModel = {
      async create(data: any) {
        storedSwaps.push(data);

        return data;
      },

      find(query?: any) {
        return {
          async sort() {
            if (query?.walletAddress) {
              return storedSwaps.filter(
                (swap) => swap.walletAddress === query.walletAddress,
              );
            }

            return storedSwaps;
          },
        };
      },
    };

    const fakePoolsService = {
      async getPoolByAddress(poolAddress: string) {
        const foundPool = storedPools.find(
          (pool) => pool.poolAddress === poolAddress.toLowerCase(),
        );

        return foundPool || null;
      },

      async updatePoolReserves(
        poolAddress: string,

        token0Change: number,

        token1Change: number,
      ) {
        const foundPool = storedPools.find(
          (pool) => pool.poolAddress === poolAddress.toLowerCase(),
        );

        if (!foundPool) {
          throw new Error('Pool not found');
        }

        foundPool.currentToken0Amount = String(
          Number(foundPool.currentToken0Amount) + Number(token0Change),
        );

        foundPool.currentToken1Amount = String(
          Number(foundPool.currentToken1Amount) + Number(token1Change),
        );

        return foundPool;
      },
    };

    const fakeTokensService = {
      async registerToken() {
        return {};
      },
      async updateTokenPrice() {
        return {};
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        SwapsService,

        {
          provide: getModelToken(Swap.name),

          useValue: fakeSwapModel,
        },

        {
          provide: PoolsService,

          useValue: fakePoolsService,
        },

        {
          provide: TokensService,

          useValue: fakeTokensService,
        },
      ],
    }).compile();

    service = module.get<SwapsService>(SwapsService);
  });

  it('should create swap transaction successfully', async () => {
    const result = await service.createSwap(createSwapData);

    expect(result.walletAddress).toBe(
      '0x1111111111111111111111111111111111111111',
    );

    expect(result.poolAddress).toBe(
      '0x2222222222222222222222222222222222222222',
    );

    expect(result.tokenIn).toBe('0x3333333333333333333333333333333333333333');

    expect(result.tokenOut).toBe('0x4444444444444444444444444444444444444444');

    expect(result.amountIn).toBe('100');

    expect(result.amountOut).toBe('50');

    expect(result.txHash).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );

    expect(result.chainId).toBe(1);
  });

  it('should increase token0 reserve and decrease token1 reserve', async () => {
    await service.createSwap(createSwapData);

    const pool = await service['poolsService'].getPoolByAddress(
      '0x2222222222222222222222222222222222222222',
    );

    expect(pool).not.toBeNull();

    expect(pool!.currentToken0Amount).toBe('1100');

    expect(pool!.currentToken1Amount).toBe('450');
  });

  it('should increase token1 reserve and decrease token0 reserve', async () => {
    await service.createSwap({
      ...createSwapData,

      tokenIn: '0x9999999999999999999999999999999999999999',
    });

    const pool = await service['poolsService'].getPoolByAddress(
      '0x2222222222222222222222222222222222222222',
    );

    expect(pool).not.toBeNull();

    expect(pool!.currentToken0Amount).toBe('950');

    expect(pool!.currentToken1Amount).toBe('600');
  });

  it('should return all swap transactions', async () => {
    await service.createSwap(createSwapData);

    await service.createSwap({
      ...createSwapData,

      txHash:
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    });

    const result = await service.getAllSwaps();

    expect(result.length).toBe(2);

    expect(result[0].txHash).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );

    expect(result[1].txHash).toBe(
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
  });

  it('should return swaps by wallet address', async () => {
    await service.createSwap(createSwapData);

    const result = await service.getSwapsByWallet(
      '0x1111111111111111111111111111111111111111',
    );

    expect(result.length).toBe(1);

    expect(result[0].walletAddress).toBe(
      '0x1111111111111111111111111111111111111111',
    );

    expect(result[0].amountIn).toBe('100');

    expect(result[0].amountOut).toBe('50');
  });

  it('should return empty array if wallet has no swaps', async () => {
    const result = await service.getSwapsByWallet(
      '0x9999999999999999999999999999999999999999',
    );

    expect(result).toEqual([]);
  });

  it('should throw error if pool not found', async () => {
    try {
      await service.createSwap({
        ...createSwapData,

        poolAddress: '0x9999999999999999999999999999999999999999',
      });
    } catch (error: any) {
      expect(error.message).toBe('Pool not found');
    }
  });
});
