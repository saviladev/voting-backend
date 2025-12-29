import { Module } from '@nestjs/common';
import { ElectionsService } from './elections.service';
import { ElectionsController } from './elections.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ElectionSchedulerService } from './election-scheduler.service';

@Module({
  imports: [PrismaModule],
  controllers: [ElectionsController],
  providers: [ElectionsService, ElectionSchedulerService],
})
export class ElectionsModule {}
