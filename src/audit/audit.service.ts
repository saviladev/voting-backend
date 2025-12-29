import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    action: string,
    entity: string,
    entityId: string,
    data?: Partial<Prisma.AuditLogUncheckedCreateInput>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userId: data?.userId,
        ipHash: data?.ipHash,
        metadata: data?.metadata ?? undefined,
      },
    });
  }

  async listLogs(query: ListAuditLogsDto) {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) {
      where.action = query.action;
    }
    if (query.entity) {
      where.entity = query.entity;
    }
    if (query.userId) {
      where.userId = query.userId;
    }
    const limit = query.limit ?? 50;
    return this.prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            dni: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
