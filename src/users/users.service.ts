import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';

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
      select: {
        id: true,
        dni: true,
        isActive: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        chapter: {
          select: {
            id: true,
            name: true,
            branch: {
              select: {
                id: true,
                name: true,
                association: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            }
          }
        }
      }
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const dataToUpdate: Prisma.UserUpdateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email,
    };

    // Handle password change
    if (dto.newPassword && dto.oldPassword) {
      const passwordMatch = await argon2.verify(user.passwordHash, dto.oldPassword);
      if (!passwordMatch) {
        throw new BadRequestException('Invalid old password');
      }
      dataToUpdate.passwordHash = await argon2.hash(dto.newPassword);
    } else if (dto.newPassword && !dto.oldPassword) {
      throw new BadRequestException('Old password is required to set a new password.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        dni: true,
        isActive: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        chapter: {
          select: {
            id: true,
            name: true,
            branch: {
              select: {
                id: true,
                name: true,
                association: {
                  select: {
                    id: true,
                    name: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    return updated;
  }
}
