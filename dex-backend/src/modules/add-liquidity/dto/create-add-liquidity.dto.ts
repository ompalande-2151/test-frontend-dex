import { IsEthereumAddress, IsNumber, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateAddLiquidityDto {
  @ApiProperty({
    example: '0xab905aba2cf13128f1233f68800d85a275eddbcf',
    description: 'Pool address for liquidity provision',
  })
  @IsEthereumAddress()
  poolAddress!: string;

  @ApiProperty({
    example: '1000000',
    description: 'Amount of token0 to add as liquidity',
  })
  @IsString()
  token0Amount!: string;

  @ApiProperty({
    example: '1000',
    description: 'Amount of token1 to add as liquidity',
  })
  @IsString()
  token1Amount!: string;

  @ApiProperty({
    example: '0x742d35cc6634c0532925a3b844bc99e4d8141f3e',
    description: 'Wallet address providing liquidity',
  })
  @IsEthereumAddress()
  walletAddress!: string;

  @ApiProperty({
    example:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    description: 'Transaction hash (64 hex characters)',
  })
  @IsString()
  txHash!: string;

  @ApiProperty({
    example: 1,
    description: 'Blockchain chain ID',
  })
  @IsNumber()
  chainId!: number;
}
