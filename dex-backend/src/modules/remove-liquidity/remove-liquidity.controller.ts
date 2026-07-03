import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { RemoveLiquidityService } from './remove-liquidity.service';

import { CreateRemoveLiquidityDto } from './dto/create-remove-liquidity.dto';

@ApiTags('Remove Liquidity')
@Controller('remove-liquidity')
export class RemoveLiquidityController {
  constructor(
    private readonly removeLiquidityService: RemoveLiquidityService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Remove liquidity from a pool' })
  @ApiResponse({
    status: 201,
    description: 'Liquidity removed successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or pool not found',
  })
  create(
    @Body()
    createRemoveLiquidityDto: CreateRemoveLiquidityDto,
  ) {
    return this.removeLiquidityService.create(createRemoveLiquidityDto);
  }

  @Get(':poolAddress')
  @ApiOperation({ summary: 'Get all remove liquidity transactions for a pool' })
  @ApiParam({
    name: 'poolAddress',
    example: '0xab905aba2cf13128f1233f68800d85a275eddbcf',
    description: 'Pool address',
  })
  @ApiResponse({
    status: 200,
    description: 'Liquidity transactions retrieved successfully',
  })
  getPoolRemoveLiquidityTransactions(
    @Param('poolAddress')
    poolAddress: string,
  ) {
    return this.removeLiquidityService.getPoolRemoveLiquidityTransactions(
      poolAddress,
    );
  }
}
