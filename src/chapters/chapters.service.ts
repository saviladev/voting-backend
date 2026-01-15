import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';

@Injectable()
export class ChaptersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  list() {
    return this.prisma.chapter.findMany({
      where: {
        deletedAt: null,
        branch: { deletedAt: null, association: { deletedAt: null } },
      },
      include: {
        branch: { include: { association: true } },
        specialties: {
          where: { specialty: { deletedAt: null } },
          include: { specialty: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateChapterDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, deletedAt: null },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (dto.specialtyIds && dto.specialtyIds.length > 0) {
      const specialties = await this.prisma.specialty.findMany({
        where: { id: { in: dto.specialtyIds }, deletedAt: null },
      });
      if (specialties.length !== dto.specialtyIds.length) {
        throw new NotFoundException('Specialty not found');
      }
      const invalidAssociation = specialties.find(
        (specialty) => specialty.associationId !== branch.associationId,
      );
      if (invalidAssociation) {
        throw new ConflictException(
          'Specialty does not belong to branch association',
        );
      }
      const existingAssignments = await this.prisma.chapterSpecialty.findMany({
        where: { branchId: branch.id, specialtyId: { in: dto.specialtyIds } },
      });
      if (existingAssignments.length > 0) {
        throw new ConflictException(
          'Some specialties already belong to a chapter in this branch',
        );
      }
    }

    const existing = await this.prisma.chapter.findFirst({
      where: { branchId: dto.branchId, name: dto.name },
    });
    if (existing) {
      if (existing.deletedAt) {
        const restored = await this.prisma.chapter.update({
          where: { id: existing.id },
          data: { deletedAt: null, name: dto.name, branchId: dto.branchId },
        });
        if (dto.specialtyIds) {
          await this.prisma.chapterSpecialty.deleteMany({
            where: { chapterId: restored.id },
          });
          if (dto.specialtyIds.length > 0) {
            await this.prisma.chapterSpecialty.createMany({
              data: dto.specialtyIds.map((specialtyId) => ({
                chapterId: restored.id,
                specialtyId,
                branchId: branch.id,
              })),
            });
          }
        }
        await this.auditService.log('CHAPTER_RESTORE', 'Chapter', restored.id, {
          metadata: {
            name: restored.name,
            branchId: restored.branchId,
            specialtyIds: dto.specialtyIds,
          },
        });
        return restored;
      }
      throw new ConflictException('Chapter already exists for this branch');
    }

    try {
      const chapter = await this.prisma.chapter.create({
        data: {
          name: dto.name,
          branchId: dto.branchId,
        },
      });
      if (dto.specialtyIds && dto.specialtyIds.length > 0) {
        await this.prisma.chapterSpecialty.createMany({
          data: dto.specialtyIds.map((specialtyId) => ({
            chapterId: chapter.id,
            specialtyId,
            branchId: branch.id,
          })),
        });
      }
      await this.auditService.log('CHAPTER_CREATE', 'Chapter', chapter.id, {
        metadata: {
          name: chapter.name,
          branchId: dto.branchId,
          specialtyIds: dto.specialtyIds,
        },
      });
      return chapter;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Chapter already exists for this branch');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateChapterDto) {
    const chapter = await this.prisma.chapter.findFirst({
      where: { id, deletedAt: null },
      include: {
        branch: true,
        specialties: true,
      },
    });
    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    const nextBranchId = dto.branchId ?? chapter.branchId;
    const branchChanged = nextBranchId !== chapter.branchId;
    const branch = await this.prisma.branch.findFirst({
      where: { id: nextBranchId, deletedAt: null },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const nextSpecialtyIds =
      dto.specialtyIds ?? chapter.specialties.map((entry) => entry.specialtyId);
    if (nextSpecialtyIds.length > 0) {
      const specialties = await this.prisma.specialty.findMany({
        where: { id: { in: nextSpecialtyIds }, deletedAt: null },
      });
      if (specialties.length !== nextSpecialtyIds.length) {
        throw new NotFoundException('Specialty not found');
      }
      const invalidAssociation = specialties.find(
        (specialty) => specialty.associationId !== branch.associationId,
      );
      if (invalidAssociation) {
        throw new ConflictException(
          'Specialty does not belong to branch association',
        );
      }
      const existingAssignments = await this.prisma.chapterSpecialty.findMany({
        where: {
          branchId: branch.id,
          specialtyId: { in: nextSpecialtyIds },
          chapterId: { not: id },
        },
      });
      if (existingAssignments.length > 0) {
        throw new ConflictException(
          'Some specialties already belong to another chapter in this branch',
        );
      }
    }

    try {
      const updated = await this.prisma.chapter.update({
        where: { id },
        data: {
          name: dto.name,
          branchId: dto.branchId,
        },
      });
      if (dto.specialtyIds) {
        await this.prisma.chapterSpecialty.deleteMany({
          where: { chapterId: id },
        });
        if (dto.specialtyIds.length > 0) {
          await this.prisma.chapterSpecialty.createMany({
            data: dto.specialtyIds.map((specialtyId) => ({
              chapterId: id,
              specialtyId,
              branchId: branch.id,
            })),
          });
        }
      } else if (branchChanged) {
        await this.prisma.chapterSpecialty.updateMany({
          where: { chapterId: id },
          data: { branchId: branch.id },
        });
      }
      await this.auditService.log('CHAPTER_UPDATE', 'Chapter', updated.id, {
        metadata: {
          name: updated.name,
          branchId: nextBranchId,
          specialtyIds: nextSpecialtyIds,
        },
      });
      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Chapter already exists for this branch');
      }
      throw error;
    }
  }

  async softDelete(id: string) {
    const chapter = await this.prisma.chapter.findFirst({
      where: { id, deletedAt: null },
    });
    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    const deleted = await this.prisma.chapter.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.auditService.log('CHAPTER_DELETE', 'Chapter', deleted.id, {
      metadata: { name: deleted.name },
    });
    return { success: true };
  }
}
