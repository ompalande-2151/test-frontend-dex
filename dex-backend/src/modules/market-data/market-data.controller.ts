import { Controller, Get, Param } from '@nestjs/common';

import { MarketDataService } from './market-data.service';

@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get()
  getAllMarketData() {
    return this.marketDataService.getAllMarketData();
  }

  @Get(':tokenAddress')
  getSingleTokenMarketData(
    @Param('tokenAddress')
    tokenAddress: string,
  ) {
    return this.marketDataService.getSingleTokenMarketData(tokenAddress);
  }
}
