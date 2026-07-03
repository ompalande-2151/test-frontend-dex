import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { Swap, SwapSchema } from '../modules/swaps/schemas/swap.schema';

import {
  AddLiquidity,
  AddLiquiditySchema,
} from '../modules/add-liquidity/schemas/add-liquidity.schema';

import {
  RemoveLiquidity,
  RemoveLiquiditySchema,
} from '../modules/remove-liquidity/schemas/remove-liquidity.schema';

import { ActivityController } from './activity.controller';

import { ActivityService } from './activity.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Swap.name,
        schema: SwapSchema,
      },

      {
        name: AddLiquidity.name,
        schema: AddLiquiditySchema,
      },

      {
        name: RemoveLiquidity.name,
        schema: RemoveLiquiditySchema,
      },
    ]),
  ],

  controllers: [ActivityController],

  providers: [ActivityService],
})
export class ActivityModule {}
