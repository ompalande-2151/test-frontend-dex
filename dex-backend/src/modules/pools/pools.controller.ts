import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { CreatePoolDto } from './dto/create-pool.dto';

import { PoolsService } from './pools.service';

@ApiTags('Pools')
@Controller('pools')
export class PoolsController {
  constructor(private readonly poolsService: PoolsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new liquidity pool' })
  @ApiResponse({
    status: 201,
    description: 'Pool created successfully',
  })
  @ApiBadRequestResponse({
    description: 'Pool already exists or invalid input',
  })
  createPool(
    @Body()
    createPoolDto: CreatePoolDto,
  ) {
    return this.poolsService.createPool(createPoolDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all pools' })
  @ApiResponse({
    status: 200,
    description: 'All pools retrieved successfully',
  })
  getAllPools() {
    return this.poolsService.getAllPools();
  }

  @Get(':address')
  @ApiOperation({ summary: 'Get pool by address' })
  @ApiParam({
    name: 'address',
    example: '0xab905aba2cf13128f1233f68800d85a275eddbcf',
    description: 'Pool address',
  })
  @ApiResponse({
    status: 200,
    description: 'Pool retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Pool not found',
  })
  getPoolByAddress(@Param('address') address: string) {
    return this.poolsService.getPoolByAddress(address);
  }
}
