import { Injectable } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import {
  AddLiquidity,
  AddLiquidityDocument,
} from './schemas/add-liquidity.schema';

import { PoolsService } from '../pools/pools.service';

import { CreateAddLiquidityDto } from './dto/create-add-liquidity.dto';

@Injectable()
export class AddLiquidityService {
  constructor(
    @InjectModel(AddLiquidity.name)
    private addLiquidityModel: Model<AddLiquidityDocument>,
    private poolsService: PoolsService,
  ) {}

  //   async create(
  //     createAddLiquidityDto: CreateAddLiquidityDto,
  //   ) {
  //     return this.addLiquidityModel.create({
  //       ...createAddLiquidityDto,

  //       poolAddress:
  //         createAddLiquidityDto.poolAddress.toLowerCase(),

  //       walletAddress:
  //         createAddLiquidityDto.walletAddress.toLowerCase(),

  //       txHash:
  //         createAddLiquidityDto.txHash.toLowerCase(),
  //     });
  //   }

  async create(createAddLiquidityDto: CreateAddLiquidityDto) {
    const transaction = await this.addLiquidityModel.create({
      ...createAddLiquidityDto,

      poolAddress: createAddLiquidityDto.poolAddress.toLowerCase(),

      walletAddress: createAddLiquidityDto.walletAddress.toLowerCase(),

      txHash: createAddLiquidityDto.txHash.toLowerCase(),
    });

    await this.poolsService.updatePoolReserves(
      createAddLiquidityDto.poolAddress,
      createAddLiquidityDto.token0Amount,
      createAddLiquidityDto.token1Amount,
    );

    return transaction;
  }

  async getPoolLiquidityTransactions(poolAddress: string) {
    return this.addLiquidityModel
      .find({
        poolAddress: poolAddress.toLowerCase(),
      })
      .sort({
        createdAt: -1,
      });
  }
}
