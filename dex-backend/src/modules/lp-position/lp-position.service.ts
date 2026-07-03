import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LpPosition, LpPositionDocument } from './schemas/lp-position.schema';
import { CreateLpPositionDto } from './dto/create-lp-position.dto';

@Injectable()
export class LpPositionService {
  constructor(
    @InjectModel(LpPosition.name)
    private lpPositionModel: Model<LpPositionDocument>,
  ) {}

  async create(createLpPositionDto: CreateLpPositionDto): Promise<LpPosition> {
    const tokenIdLower = createLpPositionDto.tokenId.toLowerCase();
    const payload = {
      ...createLpPositionDto,
      tokenId: tokenIdLower,
      poolAddress: createLpPositionDto.poolAddress.toLowerCase(),
      walletAddress: createLpPositionDto.walletAddress.toLowerCase(),
    };
    return this.lpPositionModel
      .findOneAndUpdate(
        { tokenId: tokenIdLower },
        { $set: payload },
        { new: true, upsert: true },
      )
      .exec();
  }

  async getWalletPositions(address: string): Promise<LpPosition[]> {
    return this.lpPositionModel
      .find({ walletAddress: address.toLowerCase() })
      .exec();
  }

  async getPosition(tokenId: string): Promise<LpPosition | null> {
    return this.lpPositionModel
      .findOne({ tokenId: tokenId.toLowerCase() })
      .exec();
  }
}
