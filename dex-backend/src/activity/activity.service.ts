import { Injectable } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { Swap, SwapDocument } from '../modules/swaps/schemas/swap.schema';

import {
  AddLiquidity,
  AddLiquidityDocument,
} from '../modules/add-liquidity/schemas/add-liquidity.schema';

import {
  RemoveLiquidity,
  RemoveLiquidityDocument,
} from '../modules/remove-liquidity/schemas/remove-liquidity.schema';

export interface ActivityItem {
  type: string;
  createdAt: Date;
}

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Swap.name)
    private swapModel: Model<SwapDocument>,

    @InjectModel(AddLiquidity.name)
    private addLiquidityModel: Model<AddLiquidityDocument>,

    @InjectModel(RemoveLiquidity.name)
    private removeLiquidityModel: Model<RemoveLiquidityDocument>,
  ) {}

  async getPoolActivity(
    poolAddress: string,
  ): Promise<(ActivityItem & Record<string, unknown>)[]> {
    const normalizedAddress = poolAddress.toLowerCase();

    const swaps = await this.swapModel
      .find({
        poolAddress: normalizedAddress,
      })
      .lean();

    const addLiquidity = await this.addLiquidityModel
      .find({
        poolAddress: normalizedAddress,
      })
      .lean();

    const removeLiquidity = await this.removeLiquidityModel
      .find({
        poolAddress: normalizedAddress,
      })
      .lean();

    const formattedSwaps = swaps.map((swap) => ({
      type: 'swap',
      ...swap,
    }));

    const formattedAdds = addLiquidity.map((item) => ({
      type: 'add-liquidity',
      ...item,
    }));

    const formattedRemoves = removeLiquidity.map((item) => ({
      type: 'remove-liquidity',
      ...item,
    }));

    const activities = [
      ...formattedSwaps,
      ...formattedAdds,
      ...formattedRemoves,
    ] as (ActivityItem & Record<string, unknown>)[];

    return activities.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}
