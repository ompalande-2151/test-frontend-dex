import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { AddLiquidityController } from './add-liquidity.controller';

import { AddLiquidityService } from './add-liquidity.service';

import { PoolsModule } from '../pools/pools.module';

import {
  AddLiquidity,
  AddLiquiditySchema,
} from './schemas/add-liquidity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AddLiquidity.name,
        schema: AddLiquiditySchema,
      },
    ]),
    PoolsModule,
  ],

  controllers: [AddLiquidityController],

  providers: [AddLiquidityService],
})
export class AddLiquidityModule {}
