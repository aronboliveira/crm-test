import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import MilestoneEntity from '../../entities/MilestoneEntity';
import MilestonesController from './milestones.controller';
import MilestonesService from './milestones.service';

@Module({
  imports: [TypeOrmModule.forFeature([MilestoneEntity])],
  controllers: [MilestonesController],
  providers: [MilestonesService],
  exports: [MilestonesService],
})
export default class MilestonesModule {}
