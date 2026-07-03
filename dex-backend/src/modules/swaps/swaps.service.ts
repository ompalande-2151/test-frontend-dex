import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { CreateSwapDto } from './dto/create-swap.dto';

import { Swap, SwapDocument } from './schemas/swap.schema';

import { PoolsService } from '../pools/pools.service';

import { TokensService } from '../tokens/tokens.service';

@Injectable()
export class SwapsService {
  constructor(
    @InjectModel(Swap.name)
    private swapModel: Model<SwapDocument>,
    private poolsService: PoolsService,
    private tokensService: TokensService,
  ) {}

  // async createSwap(
  //   createSwapDto: CreateSwapDto,
  // ) {
  //   const existingSwap =
  //     await this.swapModel.findOne({
  //       txHash:
  //         createSwapDto.txHash.toLowerCase(),
  //     });

  //   if (existingSwap) {
  //     throw new BadRequestException(
  //       'Swap already exists',
  //     );
  //   }

  //   const swap =
  //     await this.swapModel.create({
  //       walletAddress:
  //         createSwapDto.walletAddress.toLowerCase(),

  //       poolAddress:
  //         createSwapDto.poolAddress.toLowerCase(),

  //       tokenIn:
  //         createSwapDto.tokenIn.toLowerCase(),

  //       tokenOut:
  //         createSwapDto.tokenOut.toLowerCase(),

  //       amountIn:
  //         createSwapDto.amountIn,

  //       amountOut:
  //         createSwapDto.amountOut,

  //       txHash:
  //         createSwapDto.txHash.toLowerCase(),

  //       chainId:
  //         createSwapDto.chainId,
  //     });

  //   return {
  //     success: true,
  //     message:
  //       'Swap stored successfully',

  //     data: swap,
  //   };
  // }

  async createSwap(createSwapDto: CreateSwapDto) {
    const transaction = await this.swapModel.create({
      ...createSwapDto,

      poolAddress: createSwapDto.poolAddress.toLowerCase(),

      walletAddress: createSwapDto.walletAddress.toLowerCase(),

      txHash: createSwapDto.txHash.toLowerCase(),

      tokenIn: createSwapDto.tokenIn.toLowerCase(),

      tokenOut: createSwapDto.tokenOut.toLowerCase(),

      price: createSwapDto.price,
    });

    const pool = await this.poolsService.getPoolByAddress(
      createSwapDto.poolAddress,
    );

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    let token0Change = '0';
    let token1Change = '0';

    if (
      createSwapDto.tokenIn.toLowerCase() === pool.token0Address.toLowerCase()
    ) {
      token0Change = createSwapDto.amountIn;
      token1Change = '-' + createSwapDto.amountOut;
    } else {
      token1Change = createSwapDto.amountIn;
      token0Change = '-' + createSwapDto.amountOut;
    }

    await this.poolsService.updatePoolReserves(
      createSwapDto.poolAddress,
      token0Change,
      token1Change,
    );

    // Update token0 price with swap price
    await this.tokensService.updateTokenPrice(
      pool.token0Address,
      String(createSwapDto.price),
    );

    return transaction;
  }

  async getAllSwaps() {
    return this.swapModel.find().sort({ createdAt: -1 });
  }

  async getSwapsByWallet(walletAddress: string) {
    return this.swapModel
      .find({
        walletAddress: walletAddress.toLowerCase(),
      })
      .sort({ createdAt: -1 });
  }
}
