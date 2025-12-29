import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AssociationsController } from './associations.controller';
import { AssociationsService } from './associations.service';

@Module({
  imports: [AuditModule],
  controllers: [AssociationsController],
  providers: [AssociationsService],
})
export class AssociationsModule {}
