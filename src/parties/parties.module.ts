import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PartiesController } from './parties.controller';
import { PartiesService } from './parties.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PartiesController],
  providers: [PartiesService],
})
export class PartiesModule {}
