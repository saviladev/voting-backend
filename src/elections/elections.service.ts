import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { CreateCandidateListDto } from './dto/create-candidate-list.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';

@Injectable()
export class ElectionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateElectionDto) {
    const { positions, ...data } = dto;
    return this.prisma.election.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        positions: {
          create: positions,
        },
      },
      include: {
        positions: true,
      }
    });
  }

  async findAll() {
    return this.prisma.election.findMany({
      include: {
        positions: true,
        candidateLists: {
            include: {
                politicalParty: true
            }
        },
        association: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const election = await this.prisma.election.findUnique({
      where: { id },
      include: {
        positions: {
            orderBy: { order: 'asc' }
        },
        candidateLists: {
            include: {
                politicalParty: true,
                candidates: {
                    include: {
                        position: true
                    }
                }
            }
        },
        association: true,
        branch: true,
        chapter: true
      },
    });
    if (!election) throw new NotFoundException('Election not found');
    return election;
  }

  async createCandidateList(dto: CreateCandidateListDto) {
    return this.prisma.candidateList.create({
      data: dto,
    });
  }

  async addCandidate(dto: CreateCandidateDto) {
    const candidateList = await this.prisma.candidateList.findUnique({
        where: { id: dto.candidateListId },
        include: { 
            election: true,
            candidates: true
        }
    });
    if (!candidateList) throw new NotFoundException('Candidate List not found');

    const position = await this.prisma.electionPosition.findUnique({
        where: { id: dto.positionId }
    });
    if (!position) throw new NotFoundException('Position not found');

    if (position.electionId !== candidateList.electionId) {
        throw new Error('Position does not belong to the same election as the candidate list');
    }

    // Check if this position is already filled in this list
    const existingCandidate = candidateList.candidates.find(c => c.positionId === dto.positionId);
    if (existingCandidate) {
        throw new Error('This position already has a candidate in this list');
    }

    return this.prisma.candidate.create({
      data: dto
    });
  }

  async update(id: string, dto: any) {
    const updateData: any = { ...dto };
    
    // Convert date strings to Date objects if present
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }
    
    return this.prisma.election.update({
        where: { id },
        data: updateData
    });
  }

  async deleteList(listId: string) {
    // First delete all candidates in this list
    await this.prisma.candidate.deleteMany({
      where: { candidateListId: listId }
    });
    
    // Then delete the list itself
    return this.prisma.candidateList.delete({
      where: { id: listId }
    });
  }

  async updateCandidate(candidateId: string, dto: any) {
    return this.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        dni: dto.dni,
      }
    });
  }

  async deleteCandidate(candidateId: string) {
    return this.prisma.candidate.delete({
      where: { id: candidateId }
    });
  }
}
