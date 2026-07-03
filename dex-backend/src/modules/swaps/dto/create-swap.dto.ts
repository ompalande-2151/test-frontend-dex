import {
  IsEthereumAddress,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateSwapDto {
  @ApiProperty({
    example: '0x742d35cc6634c0532925a3b844bc99e4d8141f3e',
    description: 'Wallet address performing the swap',
  })
  @IsEthereumAddress()
  walletAddress!: string;

  @ApiProperty({
    example: '0xab905aba2cf13128f1233f68800d85a275eddbcf',
    description: 'Pool address where swap is executed',
  })
  @IsEthereumAddress()
  poolAddress!: string;

  @ApiProperty({
    example: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    description: 'Address of token being sold',
  })
  @IsEthereumAddress()
  tokenIn!: string;

  @ApiProperty({
    example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    description: 'Address of token being purchased',
  })
  @IsEthereumAddress()
  tokenOut!: string;

  @ApiProperty({
    example: '1000',
    description: 'Amount of tokenIn (in smallest units)',
  })
  @IsString()
  @IsNotEmpty()
  amountIn!: string;

  @ApiProperty({
    example: '2500',
    description: 'Amount of tokenOut (in smallest units)',
  })
  @IsString()
  @IsNotEmpty()
  amountOut!: string;

  @ApiProperty({
    example:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    description: 'Transaction hash (64 hex characters)',
  })
  @Matches(/^0x([A-Fa-f0-9]{64})$/)
  txHash!: string;

  @ApiProperty({
    example: 1,
    description: 'Blockchain chain ID',
  })
  @IsNumber()
  chainId!: number;

  @ApiProperty({
    example: 2.5,
    description: 'Current token0 price for this swap',
  })
  @IsNumber()
  @IsNotEmpty()
  price!: number;
}
