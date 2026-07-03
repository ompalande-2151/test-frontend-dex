import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { AddLiquidityService } from './add-liquidity.service';

import { CreateAddLiquidityDto } from './dto/create-add-liquidity.dto';

@ApiTags('Add Liquidity')
@Controller('add-liquidity')
export class AddLiquidityController {
  constructor(private readonly addLiquidityService: AddLiquidityService) {}

  @Post()
  @ApiOperation({ summary: 'Add liquidity to a pool' })
  @ApiResponse({
    status: 201,
    description: 'Liquidity added successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or pool not found',
  })
  create(
    @Body()
    createAddLiquidityDto: CreateAddLiquidityDto,
  ) {
    return this.addLiquidityService.create(createAddLiquidityDto);
  }

  @Get(':poolAddress')
  @ApiOperation({ summary: 'Get all add liquidity transactions for a pool' })
  @ApiParam({
    name: 'poolAddress',
    example: '0xab905aba2cf13128f1233f68800d85a275eddbcf',
    description: 'Pool address',
  })
  @ApiResponse({
    status: 200,
    description: 'Liquidity transactions retrieved successfully',
  })
  getPoolLiquidityTransactions(
    @Param('poolAddress')
    poolAddress: string,
  ) {
    return this.addLiquidityService.getPoolLiquidityTransactions(poolAddress);
  }
}
