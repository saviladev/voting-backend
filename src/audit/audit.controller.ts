import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuditService } from './audit.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logs')
@Permissions('rbac.manage')
  listLogs(@Query() query: ListAuditLogsDto) {
    return this.auditService.listLogs(query);
  }
}
