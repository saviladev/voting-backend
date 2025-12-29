import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SpecialtiesController } from './specialties.controller';
import { SpecialtiesService } from './specialties.service';

@Module({
  imports: [AuditModule],
  controllers: [SpecialtiesController],
  providers: [SpecialtiesService],
})
export class SpecialtiesModule {}
