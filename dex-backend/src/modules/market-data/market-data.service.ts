import { Injectable, NotFoundException } from '@nestjs/common';

import { HttpService } from '@nestjs/axios';

import { firstValueFrom } from 'rxjs';

import { TokensService } from '../tokens/tokens.service';

import { COINGECKO_PLATFORMS } from '../../common/constants/coingecko-platforms';

interface CoingeckoMarketData {
  market_data?: {
    current_price?: { usd?: number };
    price_change_percentage_24h?: number;
    fully_diluted_valuation?: { usd?: number };
    total_volume?: { usd?: number };
    market_cap?: { usd?: number };
  };
  image?: {
    large?: string;
  };
}

export interface TokenMarketData {
  tokenAddress: string;
  symbol: string;
  chainId: number;
  price: number;
  change24h: number;
  fdv: number;
  volume24h: number;
  marketCap: number;
  image: string | null;
}

@Injectable()
export class MarketDataService {
  constructor(
    private readonly httpService: HttpService,

    private readonly tokensService: TokensService,
  ) {}

  async getAllMarketData(): Promise<TokenMarketData[]> {
    const tokens = await this.tokensService.getAllTokens();

    const results: TokenMarketData[] = [];

    for (const token of tokens) {
      try {
        const platform = COINGECKO_PLATFORMS[token.chainId];

        if (!platform) {
          continue;
        }

        const url = `https://api.coingecko.com/api/v3/coins/${platform}/contract/${token.tokenAddress}`;

        const response = await firstValueFrom(
          this.httpService.get<CoingeckoMarketData>(url),
        );

        const data = response.data;

        results.push({
          tokenAddress: token.tokenAddress,

          symbol: token.symbol,

          chainId: token.chainId,

          price: data.market_data?.current_price?.usd || 0,

          change24h: data.market_data?.price_change_percentage_24h || 0,

          fdv: data.market_data?.fully_diluted_valuation?.usd || 0,

          volume24h: data.market_data?.total_volume?.usd || 0,

          marketCap: data.market_data?.market_cap?.usd || 0,

          image: data.image?.large || null,
        });
      } catch {
        // console.log(
        //   `Failed token: ${token.symbol}`,
        // );
      }
    }

    return results;
  }

  async getSingleTokenMarketData(
    tokenAddress: string,
  ): Promise<TokenMarketData> {
    const token = await this.tokensService.getTokenByAddress(tokenAddress);

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    const platform = COINGECKO_PLATFORMS[token.chainId];

    if (!platform) {
      throw new NotFoundException('Unsupported chain');
    }

    const url = `https://api.coingecko.com/api/v3/coins/${platform}/contract/${token.tokenAddress}`;

    const response = await firstValueFrom(
      this.httpService.get<CoingeckoMarketData>(url),
    );

    const data = response.data;

    return {
      tokenAddress: token.tokenAddress,

      symbol: token.symbol,

      chainId: token.chainId,

      price: data.market_data?.current_price?.usd || 0,

      change24h: data.market_data?.price_change_percentage_24h || 0,

      fdv: data.market_data?.fully_diluted_valuation?.usd || 0,

      volume24h: data.market_data?.total_volume?.usd || 0,

      marketCap: data.market_data?.market_cap?.usd || 0,

      image: data.image?.large || null,
    };
  }
}
