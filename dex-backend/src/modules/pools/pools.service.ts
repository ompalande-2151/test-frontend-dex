import { BadRequestException, Injectable } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { CreatePoolDto } from './dto/create-pool.dto';

import { Pool, PoolDocument } from './schemas/pool.schema';
import { TokensService } from '../tokens/tokens.service';

@Injectable()
export class PoolsService {
  constructor(
    @InjectModel(Pool.name)
    private poolModel: Model<PoolDocument>,

    private readonly tokensService: TokensService,
  ) {}

  async createPool(createPoolDto: CreatePoolDto) {
    const existingPool = await this.poolModel.findOne({
      $or: [
        {
          poolAddress: createPoolDto.poolAddress.toLowerCase(),
        },
        {
          txHash: createPoolDto.txHash.toLowerCase(),
        },
      ],
    });

    if (existingPool) {
      return {
        success: false,
        message: 'Pool Already Exist',
        data: existingPool,
      };
    }

    const pool = await this.poolModel.create({
      ...createPoolDto,

      poolAddress: createPoolDto.poolAddress.toLowerCase(),

      token0Address: createPoolDto.token0Address.toLowerCase(),

      token1Address: createPoolDto.token1Address.toLowerCase(),

      token0InitialAmount: createPoolDto.token0InitialAmount,

      token1InitialAmount: createPoolDto.token1InitialAmount,

      currentToken0Amount: createPoolDto.token0InitialAmount,

      currentToken1Amount: createPoolDto.token1InitialAmount,

      creatorWallet: createPoolDto.creatorWallet.toLowerCase(),

      feeTier: createPoolDto.feeTier,

      protocol: 'v3',

      txHash: createPoolDto.txHash.toLowerCase(),
    });

    await this.tokensService.registerToken({
      tokenAddress: createPoolDto.token0Address,

      symbol: createPoolDto.token0Symbol,

      chainId: createPoolDto.chainId,

      decimals: createPoolDto.token0Decimals,

      firstPoolAddress: createPoolDto.poolAddress,
    });

    await this.tokensService.registerToken({
      tokenAddress: createPoolDto.token1Address,

      symbol: createPoolDto.token1Symbol,

      chainId: createPoolDto.chainId,

      decimals: createPoolDto.token1Decimals,

      firstPoolAddress: createPoolDto.poolAddress,
    });

    return {
      success: true,
      message: 'Pool created successfully',
      data: pool,
    };
  }

  async updatePoolReserves(
    poolAddress: string,
    token0AmountChange: string | number,
    token1AmountChange: string | number,
  ) {
    const pool = await this.poolModel.findOne({
      poolAddress: poolAddress.toLowerCase(),
    });

    if (!pool) {
      throw new Error('Pool not found');
    }

    const currentToken0 = BigInt(pool.currentToken0Amount || '0');
    const currentToken1 = BigInt(pool.currentToken1Amount || '0');

    const parseChange = (val: string | number): bigint => {
      const strVal = typeof val === 'number' ? val.toFixed(0) : String(val);
      const cleanVal = strVal.split('.')[0];
      try {
        return BigInt(cleanVal);
      } catch {
        return 0n;
      }
    };

    const change0 = parseChange(token0AmountChange);
    const change1 = parseChange(token1AmountChange);

    pool.currentToken0Amount = String(currentToken0 + change0);
    pool.currentToken1Amount = String(currentToken1 + change1);

    await pool.save();

    return pool;
  }

  async getAllPools() {
    return this.poolModel.find().sort({ createdAt: -1 });
  }

  async getPoolByAddress(poolAddress: string) {
    return this.poolModel.findOne({
      poolAddress: poolAddress.toLowerCase(),
    });
  }
}
