import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { Swap, SwapSchema } from './schemas/swap.schema';

import { SwapsController } from './swaps.controller';

import { SwapsService } from './swaps.service';

import { PoolsModule } from '../pools/pools.module';

import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Swap.name,
        schema: SwapSchema,
      },
    ]),
    PoolsModule,
    TokensModule,
  ],

  controllers: [SwapsController],

  providers: [SwapsService],

  exports: [SwapsService],
})
export class SwapsModule {}
