import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService, private auditService: AuditService) {}

  list() {
    return this.prisma.branch.findMany({
      where: { deletedAt: null, association: { deletedAt: null } },
      include: { association: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateBranchDto) {
    const association = await this.prisma.association.findFirst({
      where: { id: dto.associationId, deletedAt: null },
    });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    const existing = await this.prisma.branch.findFirst({
      where: { associationId: dto.associationId, name: dto.name },
    });
    if (existing) {
      if (existing.deletedAt) {
        const restored = await this.prisma.branch.update({
          where: { id: existing.id },
          data: { deletedAt: null, name: dto.name, associationId: dto.associationId },
        });
        await this.auditService.log('BRANCH_RESTORE', 'Branch', restored.id, {
          metadata: { name: restored.name, associationId: restored.associationId },
        });
        return restored;
      }
      throw new ConflictException('Branch already exists');
    }

    const branch = await this.prisma.branch.create({
      data: {
        associationId: dto.associationId,
        name: dto.name,
      },
    });
    await this.auditService.log('BRANCH_CREATE', 'Branch', branch.id, {
      metadata: { name: branch.name, associationId: branch.associationId },
    });
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findFirst({ where: { id, deletedAt: null } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (dto.associationId) {
      const association = await this.prisma.association.findFirst({
        where: { id: dto.associationId, deletedAt: null },
      });
      if (!association) {
        throw new NotFoundException('Association not found');
      }
    }

    try {
      const updated = await this.prisma.branch.update({
        where: { id },
        data: {
          associationId: dto.associationId,
          name: dto.name,
        },
      });
      await this.auditService.log('BRANCH_UPDATE', 'Branch', updated.id, {
        metadata: { name: updated.name, associationId: updated.associationId },
      });
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Branch already exists');
      }
      throw error;
    }
  }

  async softDelete(id: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id, deletedAt: null } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const deleted = await this.prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.auditService.log('BRANCH_DELETE', 'Branch', deleted.id, {
      metadata: { name: deleted.name },
    });
    return { success: true };
  }
}
