import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getMe(userId?: string) {
    if (!userId) {
      throw new NotFoundException('User not found');
    }
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        chapter: {
          include: {
            branch: { include: { association: true } },
            specialties: { include: { specialty: true } },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      id: user.id,
      dni: user.dni,
      isActive: user.isActive,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      chapterId: user.chapterId,
      chapter: user.chapter,
    };
  }

  async updateProfile(userId?: string, dto?: UpdateProfileDto) {
    if (!userId) {
      throw new NotFoundException('User not found');
    }
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto?.firstName,
        lastName: dto?.lastName,
        phone: dto?.phone,
        email: dto?.email,
      },
      include: {
        chapter: {
          include: {
            branch: { include: { association: true } },
            specialties: { include: { specialty: true } },
          },
        },
      },
    });

    return {
      id: updated.id,
      dni: updated.dni,
      isActive: updated.isActive,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      email: updated.email,
      chapterId: updated.chapterId,
      chapter: updated.chapter,
    };
  }
}
