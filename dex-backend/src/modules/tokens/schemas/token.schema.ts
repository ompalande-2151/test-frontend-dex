import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { HydratedDocument } from 'mongoose';

export type TokenDocument = HydratedDocument<Token>;

@Schema({
  timestamps: true,
})
export class Token {
  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  tokenAddress!: string;

  @Prop({
    required: true,
    trim: true,
  })
  symbol!: string;

  @Prop({
    required: true,
  })
  chainId!: number;

  @Prop({
    required: true,
  })
  decimals!: number;

  @Prop({
    required: true,
    lowercase: true,
  })
  firstPoolAddress!: string;

  @Prop({
    default: null,
  })
  price?: string;
}

export const TokenSchema = SchemaFactory.createForClass(Token);

TokenSchema.index(
  {
    tokenAddress: 1,
    chainId: 1,
  },
  {
    unique: true,
  },
);
