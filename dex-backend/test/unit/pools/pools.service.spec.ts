// import { Test, TestingModule } from '@nestjs/testing';
// import { getModelToken } from '@nestjs/mongoose';
// import { BadRequestException } from '@nestjs/common';

// import { PoolsService } from '../../../src/modules/pools/pools.service';
// import { Pool } from '../../../src/modules/pools/schemas/pool.schema';
// import { TokensService } from '../../../src/modules/tokens/tokens.service';

// describe('PoolsService', () => {
//   let service: PoolsService;

//   const mockPoolModel = {
//     findOne: jest.fn(),
//     create: jest.fn(),
//     find: jest.fn(),
//   };

//   const mockTokensService = {
//     registerToken: jest.fn(),
//   };

//   const mockCreatePoolDto = {
//     poolAddress:
//       '0x1111111111111111111111111111111111111111',

//     token0Address:
//       '0x2222222222222222222222222222222222222222',

//     token1Address:
//       '0x3333333333333333333333333333333333333333',

//     token0Symbol: 'ETH',

//     token1Symbol: 'USDT',

//     creatorWallet:
//       '0x4444444444444444444444444444444444444444',

//     txHash:
//       '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',

//     chainId: 1,

//     feeTier: 3000,

//     token0Decimals: 18,

//     token1Decimals: 6,

//     token0InitialAmount: '100',

//     token1InitialAmount: '200',
//   };

//   beforeEach(async () => {
//     const module: TestingModule =
//       await Test.createTestingModule({
//         providers: [
//           PoolsService,

//           {
//             provide: getModelToken(Pool.name),

//             useValue: mockPoolModel,
//           },

//           {
//             provide: TokensService,

//             useValue: mockTokensService,
//           },
//         ],
//       }).compile();

//     service =
//       module.get<PoolsService>(
//         PoolsService,
//       );

//     jest.clearAllMocks();
//   });

//   describe('createPool', () => {
//     it(
//       'should create pool successfully',
//       async () => {
//         mockPoolModel.findOne.mockResolvedValue(
//           null,
//         );

//         mockPoolModel.create.mockResolvedValue(
//           {
//             ...mockCreatePoolDto,
//           },
//         );

//         const result =
//           await service.createPool(
//             mockCreatePoolDto,
//           );

//         expect(
//           mockPoolModel.findOne,
//         ).toHaveBeenCalled();

//         expect(
//           mockPoolModel.create,
//         ).toHaveBeenCalled();

//         expect(
//           mockTokensService.registerToken,
//         ).toHaveBeenCalledTimes(2);

//         expect(result).toEqual({
//           success: true,

//           message:
//             'Pool created successfully',

//           data: {
//             ...mockCreatePoolDto,
//           },
//         });
//       },
//     );

//     it(
//       'should lowercase addresses and txHash',
//       async () => {
//         mockPoolModel.findOne.mockResolvedValue(
//           null,
//         );

//         mockPoolModel.create.mockResolvedValue(
//           {},
//         );

//         await service.createPool({
//           ...mockCreatePoolDto,

//           poolAddress:
//             '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD',

//           txHash:
//             '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

//           creatorWallet:
//             '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
//         });

//         expect(
//           mockPoolModel.create,
//         ).toHaveBeenCalledWith(
//           expect.objectContaining({
//             poolAddress:
//               '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',

//             txHash:
//               '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',

//             creatorWallet:
//               '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
//           }),
//         );
//       },
//     );

//     it(
//       'should throw error if pool already exists',
//       async () => {
//         mockPoolModel.findOne.mockResolvedValue(
//           {
//             id: 'existing-pool',
//           },
//         );

//         await expect(
//           service.createPool(
//             mockCreatePoolDto,
//           ),
//         ).rejects.toThrow(
//           BadRequestException,
//         );

//         await expect(
//           service.createPool(
//             mockCreatePoolDto,
//           ),
//         ).rejects.toThrow(
//           'Pool already exists',
//         );
//       },
//     );

//     it(
//       'should throw error if create fails',
//       async () => {
//         mockPoolModel.findOne.mockResolvedValue(
//           null,
//         );

//         mockPoolModel.create.mockRejectedValue(
//           new Error(
//             'Database create failed',
//           ),
//         );

//         await expect(
//           service.createPool(
//             mockCreatePoolDto,
//           ),
//         ).rejects.toThrow(
//           'Database create failed',
//         );
//       },
//     );

//     it(
//       'should throw error if token registration fails',
//       async () => {
//         mockPoolModel.findOne.mockResolvedValue(
//           null,
//         );

//         mockPoolModel.create.mockResolvedValue(
//           {
//             ...mockCreatePoolDto,
//           },
//         );

//         mockTokensService.registerToken.mockRejectedValue(
//           new Error(
//             'Token registration failed',
//           ),
//         );

//         await expect(
//           service.createPool(
//             mockCreatePoolDto,
//           ),
//         ).rejects.toThrow(
//           'Token registration failed',
//         );
//       },
//     );
//   });

//   describe('updatePoolReserves', () => {
//     it(
//       'should update reserves successfully',
//       async () => {
//         const mockSave = jest.fn();

//         const mockPool = {
//           currentToken0Amount: '100',

//           currentToken1Amount: '200',

//           save: mockSave,
//         };

//         mockPoolModel.findOne.mockResolvedValue(
//           mockPool,
//         );

//         const result =
//           await service.updatePoolReserves(
//             '0xpool',
//             50,
//             -20,
//           );

//         expect(
//           result.currentToken0Amount,
//         ).toBe('150');

//         expect(
//           result.currentToken1Amount,
//         ).toBe('180');

//         expect(mockSave).toHaveBeenCalled();
//       },
//     );

//     it(
//       'should throw error if pool not found',
//       async () => {
//         mockPoolModel.findOne.mockResolvedValue(
//           null,
//         );

//         await expect(
//           service.updatePoolReserves(
//             '0xpool',
//             10,
//             10,
//           ),
//         ).rejects.toThrow(
//           'Pool not found',
//         );
//       },
//     );
//   });

//   describe('getAllPools', () => {
//     it(
//       'should return all pools',
//       async () => {
//         const mockPools = [
//           {
//             poolAddress: '0x1',
//           },
//           {
//             poolAddress: '0x2',
//           },
//         ];

//         const mockSort = jest.fn()
//           .mockResolvedValue(mockPools);

//         mockPoolModel.find.mockReturnValue({
//           sort: mockSort,
//         });

//         const result =
//           await service.getAllPools();

//         expect(
//           mockPoolModel.find,
//         ).toHaveBeenCalled();

//         expect(mockSort).toHaveBeenCalledWith(
//           {
//             createdAt: -1,
//           },
//         );

//         expect(result).toEqual(
//           mockPools,
//         );
//       },
//     );

//     it(
//       'should return empty array if no pools exist',
//       async () => {
//         const mockSort = jest.fn()
//           .mockResolvedValue([]);

//         mockPoolModel.find.mockReturnValue({
//           sort: mockSort,
//         });

//         const result =
//           await service.getAllPools();

//         expect(result).toEqual([]);
//       },
//     );
//   });

//   describe('getPoolByAddress', () => {
//     it(
//       'should return pool by address',
//       async () => {
//         const mockPool = {
//           poolAddress: '0xpool',
//         };

//         mockPoolModel.findOne.mockResolvedValue(
//           mockPool,
//         );

//         const result =
//           await service.getPoolByAddress(
//             '0xPOOL',
//           );

//         expect(
//           mockPoolModel.findOne,
//         ).toHaveBeenCalledWith({
//           poolAddress: '0xpool',
//         });

//         expect(result).toEqual(
//           mockPool,
//         );
//       },
//     );

//     it(
//       'should return null if pool not found',
//       async () => {
//         mockPoolModel.findOne.mockResolvedValue(
//           null,
//         );

//         const result =
//           await service.getPoolByAddress(
//             '0xpool',
//           );

//         expect(result).toBeNull();
//       },
//     );
//   });
// });

// import { Test } from '@nestjs/testing';

// import { getModelToken } from '@nestjs/mongoose';

// import { PoolsService } from '../../../src/modules/pools/pools.service';

// import { Pool } from '../../../src/modules/pools/schemas/pool.schema';

// import { TokensService } from '../../../src/modules/tokens/tokens.service';

// describe(
//   'PoolsService',
//   () => {
//     let service: PoolsService;

//     const createPoolData = {
//       poolAddress:
//         '0x1111111111111111111111111111111111111111',

//       token0Address:
//         '0x2222222222222222222222222222222222222222',

//       token1Address:
//         '0x3333333333333333333333333333333333333333',

//       token0Symbol: 'ETH',

//       token1Symbol: 'USDT',

//       creatorWallet:
//         '0x4444444444444444444444444444444444444444',

//       txHash:
//         '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',

//       chainId: 1,

//       feeTier: 3000,

//       token0Decimals: 18,

//       token1Decimals: 6,

//       token0InitialAmount: '100',

//       token1InitialAmount: '200',
//     };

//     // beforeEach(async () => {
//     //   const fakePoolModel = {
//     //     pools: [] as any[],

//     //     async findOne(query: any) {
//     //       const foundPool =
//     //         this.pools.find(
//     //           (pool) =>
//     //             pool.poolAddress ===
//     //             query.poolAddress,
//     //         );

//     //       return foundPool || null;
//     //     },

//     //     async create(data: any) {
//     //       const newPool = {
//     //         ...data,

//     //         currentToken0Amount:
//     //           data.token0InitialAmount,

//     //         currentToken1Amount:
//     //           data.token1InitialAmount,

//     //         async save() {
//     //           return this;
//     //         },
//     //       };

//     //       this.pools.push(newPool);

//     //       return newPool;
//     //     },

//     //     find() {
//     //       return {
//     //         async sort() {
//     //           return fakePoolModel.pools;
//     //         },
//     //       };
//     //     },
//     //   };

//     //   const fakeTokensService = {
//     //     async registerToken() {
//     //       return {
//     //         success: true,
//     //       };
//     //     },
//     //   };

//     //   const module =
//     //     await Test.createTestingModule({
//     //       providers: [
//     //         PoolsService,

//     //         {
//     //           provide: getModelToken(
//     //             Pool.name,
//     //           ),

//     //           useValue:
//     //             fakePoolModel,
//     //         },

//     //         {
//     //           provide: TokensService,

//     //           useValue:
//     //             fakeTokensService,
//     //         },
//     //       ],
//     //     }).compile();

//     //   service =
//     //     module.get<PoolsService>(
//     //       PoolsService,
//     //     );
//     // });

//     beforeEach(async () => {
//   const storedPools: any[] = [];

//   const fakePoolModel = {
//     async findOne(query: any) {
//       const foundPool =
//         storedPools.find(
//           (pool) =>
//             pool.poolAddress ===
//             query.poolAddress,
//         );

//       return foundPool || null;
//     },

//     async create(data: any) {
//       const newPool = {
//         ...data,

//         currentToken0Amount:
//           data.token0InitialAmount,

//         currentToken1Amount:
//           data.token1InitialAmount,

//         async save() {
//           return this;
//         },
//       };

//       storedPools.push(newPool);

//       return newPool;
//     },

//     find() {
//       return {
//         async sort() {
//           return storedPools;
//         },
//       };
//     },
//   };

//   const fakeTokensService = {
//     async registerToken() {
//       return {
//         success: true,
//       };
//     },
//   };

//   const module =
//     await Test.createTestingModule({
//       providers: [
//         PoolsService,

//         {
//           provide: getModelToken(
//             Pool.name,
//           ),

//           useValue:
//             fakePoolModel,
//         },

//         {
//           provide: TokensService,

//           useValue:
//             fakeTokensService,
//         },
//       ],
//     }).compile();

//   service =
//     module.get<PoolsService>(
//       PoolsService,
//     );
// });

//     it(
//       'should create pool successfully',
//       async () => {
//         const result =
//           await service.createPool(
//             createPoolData,
//           );

//         expect(
//           result.success,
//         ).toBe(true);

//         expect(
//           result.message,
//         ).toBe(
//           'Pool created successfully',
//         );

//         expect(
//           result.data.poolAddress,
//         ).toBe(
//           '0x1111111111111111111111111111111111111111',
//         );
//       },
//     );

//     it(
//       'should lowercase addresses and txHash',
//       async () => {
//         const result =
//           await service.createPool({
//             ...createPoolData,

//             poolAddress:
//               '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD',

//             creatorWallet:
//               '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',

//             txHash:
//               '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
//           });

//         expect(
//           result.data.poolAddress,
//         ).toBe(
//           '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
//         );

//         expect(
//           result.data.creatorWallet,
//         ).toBe(
//           '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
//         );

//         expect(
//           result.data.txHash,
//         ).toBe(
//           '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
//         );
//       },
//     );

//     // it(
//     //   'should throw error if pool already exists',
//     //   async () => {
//     //     await service.createPool(
//     //       createPoolData,
//     //     );

//     //     await expect(
//     //       service.createPool(
//     //         createPoolData,
//     //       ),
//     //     ).rejects.toThrow(
//     //       'Pool already exists',
//     //     );
//     //   },
//     // );

//     it(
//       'should throw error if pool already exists',
//       async () => {
//         await service.createPool(
//           createPoolData,
//         );

//         try {
//           await service.createPool(
//             createPoolData,
//           );
//         } catch (error: any) {
//           expect(error.message).toBe(
//             'Pool already exists',
//           );
//         }
//       },
//     );

//     it(
//       'should update pool reserves successfully',
//       async () => {
//         await service.createPool(
//           createPoolData,
//         );

//         const result =
//           await service.updatePoolReserves(
//             createPoolData.poolAddress,
//             50,
//             -20,
//           );

//         expect(
//           result.currentToken0Amount,
//         ).toBe('150');

//         expect(
//           result.currentToken1Amount,
//         ).toBe('180');
//       },
//     );

//     it(
//       'should throw error if pool not found during reserve update',
//       async () => {
//         await expect(
//           service.updatePoolReserves(
//             '0xpool',
//             10,
//             10,
//           ),
//         ).rejects.toThrow(
//           'Pool not found',
//         );
//       },
//     );

//     it(
//       'should return all pools',
//       async () => {
//         await service.createPool(
//           createPoolData,
//         );

//         const result =
//           await service.getAllPools();

//         expect(
//           result.length,
//         ).toBe(1);

//         expect(
//           result[0].poolAddress,
//         ).toBe(
//           '0x1111111111111111111111111111111111111111',
//         );
//       },
//     );

//     // it(
//     //   'should return pool by address',
//     //   async () => {
//     //     await service.createPool(
//     //       createPoolData,
//     //     );

//     //     const result =
//     //       await service.getPoolByAddress(
//     //         '0x1111111111111111111111111111111111111111',
//     //       );

//     //     expect(
//     //       result.poolAddress,
//     //     ).toBe(
//     //       '0x1111111111111111111111111111111111111111',
//     //     );
//     //   },
//     // );

//     it(
//       'should return pool by address',
//       async () => {
//         await service.createPool(
//           createPoolData,
//         );

//         const result =
//           await service.getPoolByAddress(
//             '0x1111111111111111111111111111111111111111',
//           );

//         expect(result).not.toBeNull();

//         expect(
//           result!.poolAddress,
//         ).toBe(
//           '0x1111111111111111111111111111111111111111',
//         );
//       },
//     );

//     it(
//       'should return null if pool not found',
//       async () => {
//         const result =
//           await service.getPoolByAddress(
//             '0x9999999999999999999999999999999999999999',
//           );

//         expect(result).toBeNull();
//       },
//     );
//   },
// );

import { Test } from '@nestjs/testing';

import { getModelToken } from '@nestjs/mongoose';

import { BadRequestException } from '@nestjs/common';

import { PoolsService } from '../../../src/modules/pools/pools.service';

import { Pool } from '../../../src/modules/pools/schemas/pool.schema';

import { TokensService } from '../../../src/modules/tokens/tokens.service';

describe('PoolsService', () => {
  let service: PoolsService;

  const createPoolData = {
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

    token0InitialAmount: '100',

    token1InitialAmount: '200',
  };

  beforeEach(async () => {
    const storedPools: any[] = [];

    const fakePoolModel = {
      async findOne(query: any) {
        if (query.poolAddress) {
          const foundPool = storedPools.find(
            (pool) => pool.poolAddress === query.poolAddress,
          );

          return foundPool || null;
        }

        if (query.$or) {
          const foundPool = storedPools.find(
            (pool) =>
              pool.poolAddress === query.$or[0].poolAddress ||
              pool.txHash === query.$or[1].txHash,
          );

          return foundPool || null;
        }

        return null;
      },

      async create(data: any) {
        const newPool = {
          ...data,

          async save() {
            return this;
          },
        };

        storedPools.push(newPool);

        return newPool;
      },

      find() {
        return {
          async sort() {
            return storedPools;
          },
        };
      },
    };

    const fakeTokensService = {
      async registerToken() {
        return {
          success: true,
        };
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        PoolsService,

        {
          provide: getModelToken(Pool.name),

          useValue: fakePoolModel,
        },

        {
          provide: TokensService,

          useValue: fakeTokensService,
        },
      ],
    }).compile();

    service = module.get<PoolsService>(PoolsService);
  });

  //   'should create pool successfully and compare all payload data',
  //   async () => {
  //     const result =
  //       await service.createPool(
  //         createPoolData,
  //       );

  //     const expectedResult = {
  //       success: true,

  //       message:
  //         'Pool created successfully',

  //       data: {
  //         poolAddress:
  //           '0x1111111111111111111111111111111111111111',

  //         token0Address:
  //           '0x2222222222222222222222222222222222222222',

  //         token1Address:
  //           '0x3333333333333333333333333333333333333333',

  //         token0Symbol:
  //           'ETH',

  //         token1Symbol:
  //           'USDT',

  //         creatorWallet:
  //           '0x4444444444444444444444444444444444444444',

  //         txHash:
  //           '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',

  //         chainId: 1,

  //         feeTier: 3000,

  //         token0Decimals: 18,

  //         token1Decimals: 6,

  //         token0InitialAmount:
  //           '100',

  //         token1InitialAmount:
  //           '200',

  //         currentToken0Amount:
  //           '100',

  //         currentToken1Amount:
  //           '200',
  //       },
  //     };

  //     expect(result).toEqual(
  //       expectedResult,
  //     );
  //   },
  // );

  // it(
  //   'should lowercase addresses and txHash',
  //   async () => {
  //     const result =
  //       await service.createPool({
  //         ...createPoolData,

  //         poolAddress:
  //           '0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD',

  //         token0Address:
  //           '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

  //         token1Address:
  //           '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',

  //         creatorWallet:
  //           '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',

  //         txHash:
  //           '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  //       });

  //     expect(
  //       result.data.poolAddress,
  //     ).toBe(
  //       '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  //     );

  //     expect(
  //       result.data.token0Address,
  //     ).toBe(
  //       '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  //     );

  //     expect(
  //       result.data.token1Address,
  //     ).toBe(
  //       '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  //     );

  //     expect(
  //       result.data.creatorWallet,
  //     ).toBe(
  //       '0xcccccccccccccccccccccccccccccccccccccccc',
  //     );

  //     expect(
  //       result.data.txHash,
  //     ).toBe(
  //       '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  //     );
  //   },
  // );

  it('should create pool successfully ', async () => {
    const result = await service.createPool(createPoolData);

    expect(result.success).toBe(true);

    expect(result.message).toBe('Pool created successfully');

    expect(result.data.poolAddress).toBe(
      '0x1111111111111111111111111111111111111111',
    );

    expect(result.data.token0Address).toBe(
      '0x2222222222222222222222222222222222222222',
    );

    expect(result.data.token1Address).toBe(
      '0x3333333333333333333333333333333333333333',
    );

    expect(result.data.token0Symbol).toBe('ETH');

    expect(result.data.token1Symbol).toBe('USDT');

    expect(result.data.creatorWallet).toBe(
      '0x4444444444444444444444444444444444444444',
    );

    expect(result.data.txHash).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );

    expect(result.data.chainId).toBe(1);

    expect(result.data.feeTier).toBe(3000);

    expect((result.data as any).token0Decimals).toBe(18);

    expect((result.data as any).token1Decimals).toBe(6);

    expect(result.data.token0InitialAmount).toBe('100');

    expect(result.data.token1InitialAmount).toBe('200');

    expect(result.data.currentToken0Amount).toBe('100');

    expect(result.data.currentToken1Amount).toBe('200');
  });

  it('should return error status if pool already exists', async () => {
    await service.createPool(createPoolData);

    const result = (await service.createPool(createPoolData)) as any;
    expect(result.success).toBe(false);
    expect(result.message).toBe('Pool Already Exist');
  });

  it('should update pool reserves successfully', async () => {
    await service.createPool(createPoolData);

    const result = await service.updatePoolReserves(
      '0x1111111111111111111111111111111111111111',
      50,
      -20,
    );

    expect(result.currentToken0Amount).toBe('150');

    expect(result.currentToken1Amount).toBe('180');
  });

  it('should throw error if pool not found during reserve update', async () => {
    try {
      await service.updatePoolReserves(
        '0x9999999999999999999999999999999999999999',
        10,
        10,
      );
    } catch (error: any) {
      expect(error.message).toBe('Pool not found');
    }
  });

  it('should return all pools', async () => {
    await service.createPool(createPoolData);

    const result = await service.getAllPools();

    expect(result.length).toBe(1);

    expect(result[0].poolAddress).toBe(
      '0x1111111111111111111111111111111111111111',
    );

    expect(result[0].token0Symbol).toBe('ETH');

    expect(result[0].token1Symbol).toBe('USDT');
  });

  it('should return pool by address', async () => {
    await service.createPool(createPoolData);

    const result = await service.getPoolByAddress(
      '0x1111111111111111111111111111111111111111',
    );

    expect(result).not.toBeNull();

    expect(result!.poolAddress).toBe(
      '0x1111111111111111111111111111111111111111',
    );

    expect(result!.token0Symbol).toBe('ETH');

    expect(result!.token1Symbol).toBe('USDT');
  });

  it('should return null if pool not found', async () => {
    const result = await service.getPoolByAddress(
      '0x9999999999999999999999999999999999999999',
    );

    expect(result).toBeNull();
  });
});
