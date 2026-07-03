import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { Pool, PoolSchema } from './schemas/pool.schema';

import { PoolsController } from './pools.controller';

import { PoolsService } from './pools.service';

import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Pool.name,
        schema: PoolSchema,
      },
    ]),

    TokensModule,
  ],

  controllers: [PoolsController],

  providers: [PoolsService],

  exports: [PoolsService],
})
export class PoolsModule {}
