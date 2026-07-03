import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PoolsModule } from './modules/pools/pools.module';
import { SwapsModule } from './modules/swaps/swaps.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { HealthModule } from './modules/health/health.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { ChartDataModule } from './modules/chart-data/chart-data.module';
import { AddLiquidityModule } from './modules/add-liquidity/add-liquidity.module';
import { RemoveLiquidityModule } from './modules/remove-liquidity/remove-liquidity.module';
import { ActivityModule } from './activity/activity.module';
import { LpPositionModule } from './modules/lp-position/lp-position.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongoUri'),
      }),
    }),

    PoolsModule,

    SwapsModule,

    TokensModule,

    HealthModule,

    MarketDataModule,

    ChartDataModule,

    AddLiquidityModule,

    RemoveLiquidityModule,

    ActivityModule,

    LpPositionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
