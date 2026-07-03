import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LpPositionDocument = HydratedDocument<LpPosition>;

@Schema({ timestamps: true })
export class LpPosition {
  @Prop({ required: true, lowercase: true })
  tokenId!: string;

  @Prop({ required: true, lowercase: true })
  poolAddress!: string;

  @Prop({ required: true, lowercase: true })
  walletAddress!: string;

  @Prop({ required: true })
  tickLower!: number;

  @Prop({ required: true })
  tickUpper!: number;

  @Prop({ required: true })
  liquidity!: string;

  @Prop({ required: true })
  token0Amount!: string;

  @Prop({ required: true })
  token1Amount!: string;
}

export const LpPositionSchema = SchemaFactory.createForClass(LpPosition);
