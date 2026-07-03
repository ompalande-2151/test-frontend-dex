import { Module } from '@nestjs/common';

import { HttpModule } from '@nestjs/axios';

import { MarketDataController } from './market-data.controller';

import { MarketDataService } from './market-data.service';

import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [HttpModule, TokensModule],

  controllers: [MarketDataController],

  providers: [MarketDataService],
})
export class MarketDataModule {}
