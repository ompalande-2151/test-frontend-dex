import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { Swap, SwapSchema } from '../swaps/schemas/swap.schema';

import { Pool, PoolSchema } from '../pools/schemas/pool.schema';

import { Token, TokenSchema } from '../tokens/schemas/token.schema';

import { ChartDataService } from './chart-data.service';
import { ChartDataController } from './chart-data.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Swap.name,
        schema: SwapSchema,
      },

      {
        name: Pool.name,
        schema: PoolSchema,
      },

      {
        name: Token.name,
        schema: TokenSchema,
      },
    ]),
  ],

  controllers: [ChartDataController],

  providers: [ChartDataService],
})
export class ChartDataModule {}
