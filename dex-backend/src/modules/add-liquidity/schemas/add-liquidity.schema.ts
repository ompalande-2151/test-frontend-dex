import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { HydratedDocument } from 'mongoose';

export type AddLiquidityDocument = HydratedDocument<AddLiquidity>;

@Schema({
  timestamps: true,
})
export class AddLiquidity {
  @Prop({
    required: true,
    lowercase: true,
  })
  poolAddress!: string;

  @Prop({
    required: true,
  })
  token0Amount!: string;

  @Prop({
    required: true,
  })
  token1Amount!: string;

  @Prop({
    required: true,
    lowercase: true,
  })
  walletAddress!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
  })
  txHash!: string;

  @Prop({
    required: true,
  })
  chainId!: number;
}

export const AddLiquiditySchema = SchemaFactory.createForClass(AddLiquidity);
