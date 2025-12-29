import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PartyScope, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';

@Injectable()
export class PartiesService {
  constructor(private prisma: PrismaService, private auditService: AuditService) {}

  listParties() {
    return this.prisma.politicalParty.findMany({
      where: { deletedAt: null },
      include: { association: true, branch: true, chapter: true },
      orderBy: { name: 'asc' },
    });
  }

  async createParty(dto: CreatePartyDto) {
    const scopeData = await this.buildScopeData(dto);
    try {
      const party = await this.prisma.politicalParty.create({
        data: {
          name: dto.name,
          acronym: dto.acronym,
          scope: scopeData.scope,
          associationId: scopeData.associationId,
          branchId: scopeData.branchId,
          chapterId: scopeData.chapterId,
          isActive: dto.isActive ?? true,
        },
      });
      await this.auditService.log('PARTY_CREATED', 'PoliticalParty', party.id, {});
      return party;
    } catch (error) {
      this.handleUnique(error, 'Party already exists');
    }
  }

  async updateParty(id: string, dto: UpdatePartyDto) {
    const existing = await this.ensureParty(id);
    const scopeData = await this.buildScopeData(
      {
        scope: dto.scope ?? existing.scope,
        associationId: dto.associationId ?? existing.associationId ?? undefined,
        branchId: dto.branchId ?? existing.branchId ?? undefined,
        chapterId: dto.chapterId ?? existing.chapterId ?? undefined,
      },
      true,
    );
    try {
      const party = await this.prisma.politicalParty.update({
        where: { id },
        data: {
          name: dto.name,
          acronym: dto.acronym,
          scope: scopeData.scope,
          associationId: scopeData.associationId,
          branchId: scopeData.branchId,
          chapterId: scopeData.chapterId,
          isActive: dto.isActive,
        },
      });
      await this.auditService.log('PARTY_UPDATED', 'PoliticalParty', party.id, {});
      return party;
    } catch (error) {
      this.handleUnique(error, 'Party already exists');
    }
  }

  async deleteParty(id: string) {
    await this.ensureParty(id);
    const party = await this.prisma.politicalParty.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.auditService.log('PARTY_DELETED', 'PoliticalParty', party.id, {});
    return { success: true };
  }

  private async ensureParty(id: string) {
    const party = await this.prisma.politicalParty.findFirst({ where: { id, deletedAt: null } });
    if (!party) {
      throw new NotFoundException('Party not found');
    }
    return party;
  }

  private async buildScopeData(
    dto: {
      scope: PartyScope;
      associationId?: string;
      branchId?: string;
      chapterId?: string;
    },
    allowExisting = false,
  ) {
    if (!dto.scope) {
      throw new BadRequestException('Scope is required');
    }

    if (dto.scope === PartyScope.NATIONAL) {
      return { scope: PartyScope.NATIONAL, associationId: null, branchId: null, chapterId: null };
    }

    if (dto.scope === PartyScope.ASSOCIATION) {
      if (!dto.associationId) {
        throw new BadRequestException('associationId is required for ASSOCIATION scope');
      }
      const association = await this.prisma.association.findFirst({
        where: { id: dto.associationId, deletedAt: null },
      });
      if (!association) {
        throw new BadRequestException('Association not found');
      }
      return { scope: PartyScope.ASSOCIATION, associationId: dto.associationId, branchId: null, chapterId: null };
    }

    if (dto.scope === PartyScope.BRANCH) {
      if (!dto.branchId) {
        throw new BadRequestException('branchId is required for BRANCH scope');
      }
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, deletedAt: null },
      });
      if (!branch) {
        throw new BadRequestException('Branch not found');
      }
      return { scope: PartyScope.BRANCH, associationId: null, branchId: dto.branchId, chapterId: null };
    }

    if (dto.scope === PartyScope.CHAPTER) {
      if (!dto.chapterId) {
        throw new BadRequestException('chapterId is required for CHAPTER scope');
      }
      const chapter = await this.prisma.chapter.findFirst({
        where: { id: dto.chapterId, deletedAt: null },
      });
      if (!chapter) {
        throw new BadRequestException('Chapter not found');
      }
      return { scope: PartyScope.CHAPTER, associationId: null, branchId: null, chapterId: dto.chapterId };
    }

    if (allowExisting) {
      return {
        scope: dto.scope,
        associationId: dto.associationId ?? null,
        branchId: dto.branchId ?? null,
        chapterId: dto.chapterId ?? null,
      };
    }

    throw new BadRequestException('Invalid scope');
  }

  private handleUnique(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(message);
    }
    throw error;
  }
}
