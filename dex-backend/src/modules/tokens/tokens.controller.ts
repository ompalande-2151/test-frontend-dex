import { Controller, Get, Param } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import { TokensService } from './tokens.service';

@ApiTags('Tokens')
@Controller('tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tokens' })
  @ApiResponse({
    status: 200,
    description: 'All tokens retrieved successfully',
  })
  getAllTokens() {
    return this.tokensService.getAllTokens();
  }

  @Get(':address')
  @ApiOperation({ summary: 'Get token by address' })
  @ApiParam({
    name: 'address',
    example: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    description: 'Token address',
  })
  @ApiResponse({
    status: 200,
    description: 'Token retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Token not found',
  })
  getTokenByAddress(@Param('address') address: string) {
    return this.tokensService.getTokenByAddress(address);
  }
}
