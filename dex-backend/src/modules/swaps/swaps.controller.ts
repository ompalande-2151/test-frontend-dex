import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { CreateSwapDto } from './dto/create-swap.dto';

import { SwapsService } from './swaps.service';

@ApiTags('Swaps')
@Controller('swaps')
export class SwapsController {
  constructor(private readonly swapsService: SwapsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new swap transaction' })
  @ApiResponse({
    status: 201,
    description: 'Swap created successfully',
  })
  @ApiBadRequestResponse({
    description: 'Swap already exists or invalid input',
  })
  createSwap(
    @Body()
    createSwapDto: CreateSwapDto,
  ) {
    return this.swapsService.createSwap(createSwapDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all swaps' })
  @ApiResponse({
    status: 200,
    description: 'All swaps retrieved successfully',
  })
  getAllSwaps() {
    return this.swapsService.getAllSwaps();
  }

  @Get('wallet/:address')
  @ApiOperation({ summary: 'Get swaps by wallet address' })
  @ApiParam({
    name: 'address',
    example: '0x742d35cc6634c0532925a3b844bc99e4d8141f3e',
    description: 'Wallet address',
  })
  @ApiResponse({
    status: 200,
    description: 'Swaps retrieved successfully',
  })
  getSwapsByWallet(@Param('address') address: string) {
    return this.swapsService.getSwapsByWallet(address);
  }
}
