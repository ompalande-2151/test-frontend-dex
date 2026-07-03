import {
  IsEthereumAddress,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreatePoolDto {
  @ApiProperty({
    example: '0xab905aba2cf13128f1233f68800d85a275eddbcf',
    description: 'Unique pool address on the blockchain',
  })
  @IsEthereumAddress()
  poolAddress!: string;

  @ApiProperty({
    example: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    description: 'First token address in the pool pair',
  })
  @IsEthereumAddress()
  token0Address!: string;

  @ApiProperty({
    example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    description: 'Second token address in the pool pair',
  })
  @IsEthereumAddress()
  token1Address!: string;

  @ApiProperty({
    example: 'USDC',
    description: 'Symbol of the first token',
  })
  @IsString()
  @IsNotEmpty()
  token0Symbol!: string;

  @ApiProperty({
    example: 'WETH',
    description: 'Symbol of the second token',
  })
  @IsString()
  @IsNotEmpty()
  token1Symbol!: string;

  @ApiProperty({
    example: '0x742d35cc6634c0532925a3b844bc99e4d8141f3e',
    description: 'Wallet address that created the pool',
  })
  @IsEthereumAddress()
  creatorWallet!: string;

  @ApiProperty({
    example:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    description: 'Transaction hash of pool creation (64 hex characters)',
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
    example: 3000,
    description: 'Pool fee tier in basis points (e.g., 3000 = 0.3%)',
  })
  @IsNumber()
  feeTier!: number;

  @ApiProperty({
    example: 6,
    description: 'Decimal places for token0',
  })
  @IsNumber()
  token0Decimals!: number;

  @ApiProperty({
    example: 18,
    description: 'Decimal places for token1',
  })
  @IsNumber()
  token1Decimals!: number;

  @ApiProperty({
    example: '1000000',
    description: 'Initial amount of token0 (in smallest units)',
  })
  @IsString()
  token0InitialAmount!: string;

  @ApiProperty({
    example: '1000',
    description: 'Initial amount of token1 (in smallest units)',
  })
  @IsString()
  token1InitialAmount!: string;
}
