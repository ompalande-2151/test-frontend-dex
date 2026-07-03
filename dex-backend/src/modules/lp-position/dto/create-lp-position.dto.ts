import { IsString, IsNumber } from 'class-validator';

export class CreateLpPositionDto {
  @IsString()
  tokenId!: string;

  @IsString()
  poolAddress!: string;

  @IsString()
  walletAddress!: string;

  @IsNumber()
  tickLower!: number;

  @IsNumber()
  tickUpper!: number;

  @IsString()
  liquidity!: string;

  @IsString()
  token0Amount!: string;

  @IsString()
  token1Amount!: string;
}
