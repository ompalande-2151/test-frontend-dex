import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { RemoveLiquidityController } from './remove-liquidity.controller';

import { RemoveLiquidityService } from './remove-liquidity.service';

import { PoolsModule } from '../pools/pools.module';

import {
  RemoveLiquidity,
  RemoveLiquiditySchema,
} from './schemas/remove-liquidity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: RemoveLiquidity.name,
        schema: RemoveLiquiditySchema,
      },
    ]),
    PoolsModule,
  ],

  controllers: [RemoveLiquidityController],

  providers: [RemoveLiquidityService],
})
export class RemoveLiquidityModule {}
