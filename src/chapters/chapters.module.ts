import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ChaptersController } from './chapters.controller';
import { ChaptersService } from './chapters.service';

@Module({
  imports: [AuditModule],
  controllers: [ChaptersController],
  providers: [ChaptersService],
})
export class ChaptersModule {}
