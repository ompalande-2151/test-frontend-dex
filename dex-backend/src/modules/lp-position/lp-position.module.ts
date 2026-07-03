import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LpPositionController } from './lp-position.controller';
import { LpPositionService } from './lp-position.service';
import { LpPosition, LpPositionSchema } from './schemas/lp-position.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: LpPosition.name,
        schema: LpPositionSchema,
      },
    ]),
  ],
  controllers: [LpPositionController],
  providers: [LpPositionService],
})
export class LpPositionModule {}
