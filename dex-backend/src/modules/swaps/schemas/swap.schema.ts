import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { HydratedDocument } from 'mongoose';

export type SwapDocument = HydratedDocument<Swap>;

@Schema({
  timestamps: true,
})
export class Swap {
  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  walletAddress!: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  poolAddress!: string;
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  tokenIn!: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  tokenOut!: string;

  @Prop({
    required: true,
  })
  amountIn!: string;

  @Prop({
    required: true,
  })
  amountOut!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  txHash!: string;

  @Prop({
    required: true,
  })
  chainId!: number;

  @Prop({
    required: true,
  })
  price!: number;
}

export const SwapSchema = SchemaFactory.createForClass(Swap);
