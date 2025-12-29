import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssociationDto } from './dto/create-association.dto';
import { UpdateAssociationDto } from './dto/update-association.dto';

@Injectable()
export class AssociationsService {
  constructor(private prisma: PrismaService, private auditService: AuditService) {}

  list() {
    return this.prisma.association.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateAssociationDto) {
    const existing = await this.prisma.association.findFirst({ where: { name: dto.name } });
    if (existing) {
      if (existing.deletedAt) {
        const restored = await this.prisma.association.update({
          where: { id: existing.id },
          data: { deletedAt: null, name: dto.name },
        });
        await this.auditService.log('ASSOCIATION_RESTORE', 'Association', restored.id, {
          metadata: { name: restored.name },
        });
        return restored;
      }
      throw new ConflictException('Association already exists');
    }

    const association = await this.prisma.association.create({ data: { name: dto.name } });
    await this.auditService.log('ASSOCIATION_CREATE', 'Association', association.id, {
      metadata: { name: association.name },
    });
    return association;
  }

  async update(id: string, dto: UpdateAssociationDto) {
    const association = await this.prisma.association.findFirst({
      where: { id, deletedAt: null },
    });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    try {
      const updated = await this.prisma.association.update({
        where: { id },
        data: { name: dto.name },
      });
      await this.auditService.log('ASSOCIATION_UPDATE', 'Association', updated.id, {
        metadata: { name: updated.name },
      });
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Association already exists');
      }
      throw error;
    }
  }

  async softDelete(id: string) {
    const association = await this.prisma.association.findFirst({
      where: { id, deletedAt: null },
    });
    if (!association) {
      throw new NotFoundException('Association not found');
    }

    const deleted = await this.prisma.association.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.auditService.log('ASSOCIATION_DELETE', 'Association', deleted.id, {
      metadata: { name: deleted.name },
    });
    return { success: true };
  }
}
