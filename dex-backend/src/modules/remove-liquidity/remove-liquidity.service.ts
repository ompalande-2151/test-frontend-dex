import { Injectable } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import {
  RemoveLiquidity,
  RemoveLiquidityDocument,
} from './schemas/remove-liquidity.schema';

import { CreateRemoveLiquidityDto } from './dto/create-remove-liquidity.dto';
import { PoolsService } from '../pools/pools.service';

@Injectable()
export class RemoveLiquidityService {
  constructor(
    @InjectModel(RemoveLiquidity.name)
    private removeLiquidityModel: Model<RemoveLiquidityDocument>,
    private poolsService: PoolsService,
  ) {}

  //   async create(
  //     createRemoveLiquidityDto: CreateRemoveLiquidityDto,
  //   ) {
  //     return this.removeLiquidityModel.create({
  //       ...createRemoveLiquidityDto,

  //       poolAddress:
  //         createRemoveLiquidityDto.poolAddress.toLowerCase(),

  //       walletAddress:
  //         createRemoveLiquidityDto.walletAddress.toLowerCase(),

  //       txHash:
  //         createRemoveLiquidityDto.txHash.toLowerCase(),
  //     });
  //   }

  async create(createRemoveLiquidityDto: CreateRemoveLiquidityDto) {
    const transaction = await this.removeLiquidityModel.create({
      ...createRemoveLiquidityDto,

      poolAddress: createRemoveLiquidityDto.poolAddress.toLowerCase(),

      walletAddress: createRemoveLiquidityDto.walletAddress.toLowerCase(),

      txHash: createRemoveLiquidityDto.txHash.toLowerCase(),
    });

    await this.poolsService.updatePoolReserves(
      createRemoveLiquidityDto.poolAddress,
      '-' + createRemoveLiquidityDto.token0Amount,
      '-' + createRemoveLiquidityDto.token1Amount,
    );

    return transaction;
  }

  async getPoolRemoveLiquidityTransactions(poolAddress: string) {
    return this.removeLiquidityModel
      .find({
        poolAddress: poolAddress.toLowerCase(),
      })
      .sort({
        createdAt: -1,
      });
  }
}
