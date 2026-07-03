import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { LpPositionService } from './lp-position.service';
import { CreateLpPositionDto } from './dto/create-lp-position.dto';

@ApiTags('LP Positions')
@Controller('lp-positions')
export class LpPositionController {
  constructor(private readonly lpPositionService: LpPositionService) {}

  @Post()
  @ApiOperation({ summary: 'Sync/create an LP position' })
  @ApiResponse({
    status: 201,
    description: 'LP position created successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input',
  })
  create(@Body() createLpPositionDto: CreateLpPositionDto) {
    return this.lpPositionService.create(createLpPositionDto);
  }

  @Get('wallet/:address')
  @ApiOperation({ summary: 'Get all LP positions for a wallet' })
  @ApiParam({
    name: 'address',
    example: '0x9b18daf9b545bf77ee2fc699251c40d69c3a3e3e',
    description: 'Wallet address',
  })
  @ApiResponse({
    status: 200,
    description: 'LP positions retrieved successfully',
  })
  getWalletPositions(@Param('address') address: string) {
    return this.lpPositionService.getWalletPositions(address);
  }

  @Get(':tokenId')
  @ApiOperation({ summary: 'Get a specific LP position by token ID' })
  @ApiParam({
    name: 'tokenId',
    example: 'lp-pos-1',
    description: 'LP token ID',
  })
  @ApiResponse({
    status: 200,
    description: 'LP position retrieved successfully',
  })
  getPosition(@Param('tokenId') tokenId: string) {
    return this.lpPositionService.getPosition(tokenId);
  }
}
