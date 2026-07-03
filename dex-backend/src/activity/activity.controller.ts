import { Controller, Get, Param } from '@nestjs/common';

import { ActivityService } from './activity.service';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get(':poolAddress')
  getPoolActivity(
    @Param('poolAddress')
    poolAddress: string,
  ) {
    return this.activityService.getPoolActivity(poolAddress);
  }
}
