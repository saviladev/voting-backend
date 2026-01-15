import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';

@Injectable()
export class SpecialtiesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  list() {
    return this.prisma.specialty.findMany({
      where: { deletedAt: null, association: { deletedAt: null } },
      include: {
        association: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateSpecialtyDto) {
    const association = await this.prisma.association.findFirst({
      where: { id: dto.associationId, deletedAt: null },
    });
    if (!association) {
      throw new NotFoundException('Association not found');
    }
    const existing = await this.prisma.specialty.findFirst({
      where: { associationId: dto.associationId, name: dto.name },
    });
    if (existing) {
      if (existing.deletedAt) {
        const restored = await this.prisma.specialty.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            name: dto.name,
            associationId: dto.associationId,
          },
        });
        await this.auditService.log(
          'SPECIALTY_RESTORE',
          'Specialty',
          restored.id,
          {
            metadata: { name: restored.name },
          },
        );
        return restored;
      }
      throw new ConflictException('Specialty already exists');
    }
    const specialty = await this.prisma.specialty.create({
      data: { name: dto.name, associationId: dto.associationId },
    });
    await this.auditService.log('SPECIALTY_CREATE', 'Specialty', specialty.id, {
      metadata: { name: specialty.name },
    });
    return specialty;
  }

  async update(id: string, dto: UpdateSpecialtyDto) {
    const specialty = await this.prisma.specialty.findFirst({
      where: { id, deletedAt: null },
    });
    if (!specialty) {
      throw new NotFoundException('Specialty not found');
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
      const updated = await this.prisma.specialty.update({
        where: { id },
        data: { name: dto.name, associationId: dto.associationId },
      });
      await this.auditService.log('SPECIALTY_UPDATE', 'Specialty', updated.id, {
        metadata: { name: updated.name },
      });
      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Specialty already exists');
      }
      throw error;
    }
  }

  async softDelete(id: string) {
    const specialty = await this.prisma.specialty.findFirst({
      where: { id, deletedAt: null },
    });
    if (!specialty) {
      throw new NotFoundException('Specialty not found');
    }

    const deleted = await this.prisma.specialty.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.auditService.log('SPECIALTY_DELETE', 'Specialty', deleted.id, {
      metadata: { name: deleted.name },
    });
    return { success: true };
  }
}
