import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { Swap, SwapDocument } from '../swaps/schemas/swap.schema';

import { Pool, PoolDocument } from '../pools/schemas/pool.schema';

import { Token, TokenDocument } from '../tokens/schemas/token.schema';

import { Candle } from './interfaces/candle.interface';

import { bucketTime } from './utils/bucket-time';

@Injectable()
export class ChartDataService {
  constructor(
    @InjectModel(Swap.name)
    private swapModel: Model<SwapDocument>,

    @InjectModel(Pool.name)
    private poolModel: Model<PoolDocument>,

    @InjectModel(Token.name)
    private tokenModel: Model<TokenDocument>,
  ) {}

  async getCandles(poolAddress: string, timeframe: string): Promise<Candle[]> {
    const pool = await this.poolModel.findOne({
      poolAddress: poolAddress.toLowerCase(),
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    const token0 = await this.tokenModel.findOne({
      tokenAddress: pool.token0Address.toLowerCase(),
    });

    const token1 = await this.tokenModel.findOne({
      tokenAddress: pool.token1Address.toLowerCase(),
    });

    if (!token0 || !token1) {
      throw new NotFoundException('Tokens not found');
    }

    const swaps = await this.swapModel
      .find({
        poolAddress: poolAddress.toLowerCase(),
      })
      .sort({
        createdAt: 1,
      });

    const timeframeMap: Record<string, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400,
    };

    const timeframeSeconds = timeframeMap[timeframe];

    if (!timeframeSeconds) {
      throw new NotFoundException('Invalid timeframe');
    }

    if (!swaps.length) {
      return [];
    }

    const candleMap = new Map<number, Candle>();

    for (const swap of swaps) {
      // Use swap.price directly - single source of truth
      const price = Number(swap.price);

      // Volume uses amountOut
      const volume = Number(swap.amountOut);

      const timestamp = Math.floor(new Date(swap.createdAt).getTime() / 1000);

      const bucket = bucketTime(timestamp, timeframeSeconds);

      if (!candleMap.has(bucket)) {
        candleMap.set(bucket, {
          time: bucket,

          open: price,

          high: price,

          low: price,

          close: price,

          volume: volume,
        });
      } else {
        const candle = candleMap.get(bucket)!;

        candle.high = Math.max(candle.high, price);

        candle.low = Math.min(candle.low, price);

        candle.close = price;

        candle.volume += volume;
      }
    }

    const rawCandles = Array.from(candleMap.values()).sort(
      (a, b) => a.time - b.time,
    );

    const continuousCandles: Candle[] = [];

    const firstTime = rawCandles[0].time;

    const lastTime = rawCandles[rawCandles.length - 1].time;

    let previousClose = rawCandles[0].open;

    for (
      let currentTime = firstTime;
      currentTime <= lastTime;
      currentTime += timeframeSeconds
    ) {
      const existingCandle = rawCandles.find(
        (candle) => candle.time === currentTime,
      );

      if (existingCandle) {
        // continuity fix
        existingCandle.open = previousClose;

        existingCandle.high = Math.max(
          existingCandle.high,
          existingCandle.open,
        );

        existingCandle.low = Math.min(existingCandle.low, existingCandle.open);

        continuousCandles.push(existingCandle);

        previousClose = existingCandle.close;
      } else {
        // empty candle
        const emptyCandle: Candle = {
          time: currentTime,

          open: previousClose,

          high: previousClose,

          low: previousClose,

          close: previousClose,

          volume: 0,
        };

        continuousCandles.push(emptyCandle);
      }
    }

    return continuousCandles;
  }
}
