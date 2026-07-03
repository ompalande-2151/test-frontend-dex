import { Injectable } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { Token, TokenDocument } from './schemas/token.schema';

@Injectable()
export class TokensService {
  constructor(
    @InjectModel(Token.name)
    private tokenModel: Model<TokenDocument>,
  ) {}

  async registerToken(data: {
    tokenAddress: string;
    symbol: string;
    chainId: number;
    decimals: number;
    firstPoolAddress: string;
  }) {
    const existingToken = await this.tokenModel.findOne({
      tokenAddress: data.tokenAddress.toLowerCase(),

      chainId: data.chainId,
    });

    if (existingToken) {
      return existingToken;
    }

    const token = await this.tokenModel.create({
      tokenAddress: data.tokenAddress.toLowerCase(),

      symbol: data.symbol,

      chainId: data.chainId,

      decimals: data.decimals,

      firstPoolAddress: data.firstPoolAddress.toLowerCase(),
    });

    return token;
  }

  async getAllTokens() {
    return this.tokenModel.find().sort({ createdAt: -1 });
  }

  async getTokenByAddress(tokenAddress: string) {
    return this.tokenModel.findOne({
      tokenAddress: tokenAddress.toLowerCase(),
    });
  }

  async updateTokenPrice(tokenAddress: string, price: string) {
    return this.tokenModel.findOneAndUpdate(
      {
        tokenAddress: tokenAddress.toLowerCase(),
      },
      {
        $set: {
          price: price,
        },
      },
      { new: true },
    );
  }
}
