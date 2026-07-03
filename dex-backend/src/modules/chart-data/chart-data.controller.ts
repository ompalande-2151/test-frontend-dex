import { Controller, Get, Query } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { ChartDataService } from './chart-data.service';

@ApiTags('Chart Data')
@Controller('chart-data')
export class ChartDataController {
  constructor(private readonly chartDataService: ChartDataService) {}

  @Get('candles')
  @ApiOperation({ summary: 'Get OHLC candle data for a pool' })
  @ApiQuery({
    name: 'poolAddress',
    example: '0xab905aba2cf13128f1233f68800d85a275eddbcf',
    description: 'Pool address',
  })
  @ApiQuery({
    name: 'timeframe',
    example: '1m',
    description: 'Supported values: 1m, 5m, 15m, 30m, 1h, 4h, 1d',
  })
  @ApiResponse({
    status: 200,
    description: 'Candles retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Pool or tokens not found',
  })
  getCandles(
    @Query('poolAddress')
    poolAddress: string,

    @Query('timeframe')
    timeframe: string,
  ) {
    return this.chartDataService.getCandles(poolAddress, timeframe);
  }
}
