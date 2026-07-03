// import { Test, TestingModule } from '@nestjs/testing';

// import { getModelToken } from '@nestjs/mongoose';

// import { TokensService } from '../../../src/modules/tokens/tokens.service';

// import { Token } from '../../../src/modules/tokens/schemas/token.schema';

// describe('TokensService', () => {
//   let service: TokensService;

//   const mockTokenModel = {
//     findOne: jest.fn(),

//     create: jest.fn(),

//     find: jest.fn(),
//   };

//   beforeEach(async () => {
//     const module: TestingModule =
//       await Test.createTestingModule({
//         providers: [
//           TokensService,

//           {
//             provide: getModelToken(
//               Token.name,
//             ),

//             useValue: mockTokenModel,
//           },
//         ],
//       }).compile();

//     service =
//       module.get<TokensService>(
//         TokensService,
//       );

//     jest.clearAllMocks();
//   });

//   describe('registerToken', () => {
//     const mockTokenData = {
//       tokenAddress:
//         '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

//       symbol: 'ETH',

//       chainId: 1,

//       decimals: 18,

//       firstPoolAddress:
//         '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
//     };

//     it(
//       'should create token successfully',
//       async () => {
//         const createdToken = {
//           id: 'token-id',
//         };

//         mockTokenModel.findOne.mockResolvedValue(
//           null,
//         );

//         mockTokenModel.create.mockResolvedValue(
//           createdToken,
//         );

//         const result =
//           await service.registerToken(
//             mockTokenData,
//           );

//         expect(
//           mockTokenModel.create,
//         ).toHaveBeenCalled();

//         expect(result).toEqual(
//           createdToken,
//         );
//       },
//     );

//     it(
//       'should lowercase addresses',
//       async () => {
//         mockTokenModel.findOne.mockResolvedValue(
//           null,
//         );

//         mockTokenModel.create.mockResolvedValue(
//           {},
//         );

//         await service.registerToken(
//           mockTokenData,
//         );

//         expect(
//           mockTokenModel.create,
//         ).toHaveBeenCalledWith({
//           tokenAddress:
//             '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',

//           symbol: 'ETH',

//           chainId: 1,

//           decimals: 18,

//           firstPoolAddress:
//             '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
//         });
//       },
//     );

//     it(
//       'should return existing token if already exists',
//       async () => {
//         const existingToken = {
//           id: 'existing-token',
//         };

//         mockTokenModel.findOne.mockResolvedValue(
//           existingToken,
//         );

//         const result =
//           await service.registerToken(
//             mockTokenData,
//           );

//         expect(
//           mockTokenModel.create,
//         ).not.toHaveBeenCalled();

//         expect(result).toEqual(
//           existingToken,
//         );
//       },
//     );

//     it(
//       'should throw if token creation fails',
//       async () => {
//         mockTokenModel.findOne.mockResolvedValue(
//           null,
//         );

//         mockTokenModel.create.mockRejectedValue(
//           new Error(
//             'Token creation failed',
//           ),
//         );

//         await expect(
//           service.registerToken(
//             mockTokenData,
//           ),
//         ).rejects.toThrow(
//           'Token creation failed',
//         );
//       },
//     );
//   });

//   describe('getAllTokens', () => {
//     it(
//       'should return all tokens',
//       async () => {
//         const mockTokens = [
//           {
//             symbol: 'ETH',
//           },

//           {
//             symbol: 'USDT',
//           },
//         ];

//         const mockSort = jest.fn()
//           .mockResolvedValue(
//             mockTokens,
//           );

//         mockTokenModel.find.mockReturnValue(
//           {
//             sort: mockSort,
//           },
//         );

//         const result =
//           await service.getAllTokens();

//         expect(
//           mockTokenModel.find,
//         ).toHaveBeenCalled();

//         expect(result).toEqual(
//           mockTokens,
//         );
//       },
//     );

//     it(
//       'should return empty array',
//       async () => {
//         const mockSort = jest.fn()
//           .mockResolvedValue([]);

//         mockTokenModel.find.mockReturnValue(
//           {
//             sort: mockSort,
//           },
//         );

//         const result =
//           await service.getAllTokens();

//         expect(result).toEqual([]);
//       },
//     );
//   });

//   describe('getTokenByAddress', () => {
//     it(
//       'should return token by address',
//       async () => {
//         const mockToken = {
//           symbol: 'ETH',
//         };

//         mockTokenModel.findOne.mockResolvedValue(
//           mockToken,
//         );

//         const result =
//           await service.getTokenByAddress(
//             '0xABC',
//           );

//         expect(
//           mockTokenModel.findOne,
//         ).toHaveBeenCalledWith({
//           tokenAddress:
//             '0xabc',
//         });

//         expect(result).toEqual(
//           mockToken,
//         );
//       },
//     );

//     it(
//       'should return null if token not found',
//       async () => {
//         mockTokenModel.findOne.mockResolvedValue(
//           null,
//         );

//         const result =
//           await service.getTokenByAddress(
//             '0xNOTFOUND',
//           );

//         expect(result).toBeNull();
//       },
//     );
//   });
// });

import { Test } from '@nestjs/testing';

import { getModelToken } from '@nestjs/mongoose';

import { TokensService } from '../../../src/modules/tokens/tokens.service';

import { Token } from '../../../src/modules/tokens/schemas/token.schema';

describe('TokensService', () => {
  let service: TokensService;

  const createTokenData = {
    tokenAddress: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',

    symbol: 'ETH',

    chainId: 1,

    decimals: 18,

    firstPoolAddress: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  };

  beforeEach(async () => {
    const storedTokens: any[] = [];

    const fakeTokenModel = {
      async findOne(query: any) {
        const foundToken = storedTokens.find(
          (token) => token.tokenAddress === query.tokenAddress,
        );

        return foundToken || null;
      },

      async create(data: any) {
        storedTokens.push(data);

        return data;
      },

      find() {
        return {
          async sort() {
            return storedTokens;
          },
        };
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        TokensService,

        {
          provide: getModelToken(Token.name),

          useValue: fakeTokenModel,
        },
      ],
    }).compile();

    service = module.get<TokensService>(TokensService);
  });

  it('should register token successfully', async () => {
    const result = await service.registerToken(createTokenData);

    expect(result.tokenAddress).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );

    expect(result.symbol).toBe('ETH');

    expect(result.chainId).toBe(1);

    expect(result.decimals).toBe(18);

    expect(result.firstPoolAddress).toBe(
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
  });

  it('should return existing token if already exists', async () => {
    await service.registerToken(createTokenData);

    const result = await service.registerToken(createTokenData);

    expect(result.tokenAddress).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );

    expect(result.symbol).toBe('ETH');
  });

  it('should return all registered tokens', async () => {
    await service.registerToken(createTokenData);

    await service.registerToken({
      tokenAddress: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',

      symbol: 'USDT',

      chainId: 1,

      decimals: 6,

      firstPoolAddress: '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
    });

    const result = await service.getAllTokens();

    expect(result.length).toBe(2);

    expect(result[0].symbol).toBe('ETH');

    expect(result[1].symbol).toBe('USDT');
  });

  it('should return token by address', async () => {
    await service.registerToken(createTokenData);

    const result = await service.getTokenByAddress(
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    );

    expect(result).not.toBeNull();

    expect(result!.tokenAddress).toBe(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );

    expect(result!.symbol).toBe('ETH');

    expect(result!.decimals).toBe(18);
  });

  it('should return null if token not found', async () => {
    const result = await service.getTokenByAddress(
      '0x9999999999999999999999999999999999999999',
    );

    expect(result).toBeNull();
  });
});
