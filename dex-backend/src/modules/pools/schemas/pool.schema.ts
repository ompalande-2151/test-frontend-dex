import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PoolDocument = HydratedDocument<Pool>;

@Schema({
  timestamps: true,
})
export class Pool {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  poolAddress!: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  token0Address!: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  token1Address!: string;

  @Prop({
    required: true,
  })
  token0Symbol!: string;

  @Prop({
    required: true,
  })
  token1Symbol!: string;

  @Prop({
    required: true,
  })
  token0InitialAmount!: string;

  @Prop({
    required: true,
  })
  token1InitialAmount!: string;

  @Prop({
    required: true,
  })
  currentToken0Amount!: string;

  @Prop({
    required: true,
  })
  currentToken1Amount!: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  creatorWallet!: string;

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
  feeTier!: number;

  @Prop({
    required: true,
    default: 'v3',
  })
  protocol!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PoolSchema = SchemaFactory.createForClass(Pool);
