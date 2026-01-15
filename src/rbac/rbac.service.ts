import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class RbacService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  listRoles() {
    return this.prisma.role.findMany({
      where: { deletedAt: null },
      include: {
        permissions: {
          where: { permission: { deletedAt: null } },
          include: { permission: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({
      where: { deletedAt: null },
      orderBy: { key: 'asc' },
    });
  }

  listUsers() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        chapter: {
          include: {
            branch: { include: { association: true } },
            specialties: { include: { specialty: true } },
          },
        },
        roles: {
          where: { role: { deletedAt: null } },
          include: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(dto: CreateUserDto) {
    const chapter = await this.prisma.chapter.findFirst({
      where: { id: dto.chapterId, deletedAt: null },
    });
    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    const roles = dto.roles?.length
      ? await this.prisma.role.findMany({
          where: { name: { in: dto.roles }, deletedAt: null },
        })
      : [];
    const memberRole = await this.prisma.role.findFirst({
      where: { name: 'Member', deletedAt: null },
    });

    if (dto.roles && roles.length !== dto.roles.length) {
      throw new BadRequestException('Some roles do not exist');
    }

    const passwordHash = await argon2.hash(dto.password);

    const existing = await this.prisma.user.findUnique({
      where: { dni: dto.dni },
    });
    if (existing) {
      if (existing.deletedAt) {
        const restored = await this.prisma.$transaction(async (tx) => {
          const restoredUser = await tx.user.update({
            where: { id: existing.id },
            data: {
              deletedAt: null,
              passwordHash,
              firstName: dto.firstName,
              lastName: dto.lastName,
              phone: dto.phone,
              email: dto.email,
              chapterId: dto.chapterId,
              isActive: true,
            },
          });

          await tx.userRole.deleteMany({ where: { userId: restoredUser.id } });
          const roleIds = new Set<string>();
          roles.forEach((role) => roleIds.add(role.id));
          if (memberRole) {
            roleIds.add(memberRole.id);
          }
          if (roleIds.size > 0) {
            await tx.userRole.createMany({
              data: Array.from(roleIds).map((roleId) => ({
                userId: restoredUser.id,
                roleId,
              })),
              skipDuplicates: true,
            });
          }

          return restoredUser;
        });

        await this.auditService.log('RBAC_RESTORE_USER', 'User', restored.id, {
          userId: restored.id,
          metadata: { dni: restored.dni },
        });

        return this.prisma.user.findUnique({
          where: { id: restored.id },
          include: {
            chapter: {
              include: {
                branch: { include: { association: true } },
                specialties: { include: { specialty: true } },
              },
            },
            roles: {
              where: { role: { deletedAt: null } },
              include: { role: true },
            },
          },
        });
      }
      throw new ConflictException('User already exists');
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          dni: dto.dni,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          email: dto.email,
          chapterId: dto.chapterId,
        },
      });

      const roleIds = new Set<string>();
      roles.forEach((role) => roleIds.add(role.id));
      if (memberRole) {
        roleIds.add(memberRole.id);
      }
      if (roleIds.size > 0) {
        await this.prisma.userRole.createMany({
          data: Array.from(roleIds).map((roleId) => ({
            userId: user.id,
            roleId,
          })),
          skipDuplicates: true,
        });
      }

      await this.auditService.log('RBAC_CREATE_USER', 'User', user.id, {
        userId: user.id,
        metadata: { dni: user.dni },
      });

      return this.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          chapter: {
            include: {
              branch: { include: { association: true } },
              specialties: { include: { specialty: true } },
            },
          },
          roles: {
            where: { role: { deletedAt: null } },
            include: { role: true },
          },
        },
      });
    } catch (error) {
      this.handleUnique(error, 'User already exists');
    }
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.chapterId) {
      const chapter = await this.prisma.chapter.findFirst({
        where: { id: dto.chapterId, deletedAt: null },
      });
      if (!chapter) {
        throw new NotFoundException('Chapter not found');
      }
    }

    let roles: { id: string; name: string }[] = [];
    if (dto.roles) {
      roles = await this.prisma.role.findMany({
        where: { name: { in: dto.roles }, deletedAt: null },
      });
      if (roles.length !== dto.roles.length) {
        throw new BadRequestException('Some roles do not exist');
      }
    }

    const passwordHash = dto.password
      ? await argon2.hash(dto.password)
      : undefined;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const updatedUser = await tx.user.update({
          where: { id },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            email: dto.email,
            chapterId: dto.chapterId,
            passwordHash,
            isActive: dto.isActive,
          },
        });

        if (dto.roles) {
          await tx.userRole.deleteMany({ where: { userId: id } });
          if (roles.length > 0) {
            await tx.userRole.createMany({
              data: roles.map((role) => ({ userId: id, roleId: role.id })),
            });
          }
        }

        return updatedUser;
      });

      await this.auditService.log('RBAC_UPDATE_USER', 'User', updated.id, {
        userId: updated.id,
        metadata: { dni: updated.dni },
      });

      return this.prisma.user.findUnique({
        where: { id: updated.id },
        include: {
          chapter: {
            include: {
              branch: { include: { association: true } },
              specialties: { include: { specialty: true } },
            },
          },
          roles: {
            where: { role: { deletedAt: null } },
            include: { role: true },
          },
        },
      });
    } catch (error) {
      this.handleUnique(error, 'User already exists');
    }
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
      await tx.session.deleteMany({ where: { userId: id } });
    });

    await this.auditService.log('RBAC_DELETE_USER', 'User', user.id, {
      userId: user.id,
      metadata: { dni: user.dni },
    });

    return { success: true };
  }

  async createRole(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findFirst({
      where: { name: dto.name },
    });
    if (existing) {
      if (existing.deletedAt) {
        const restored = await this.prisma.role.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            description: dto.description ?? existing.description,
          },
        });
        await this.auditService.log('RBAC_RESTORE_ROLE', 'Role', restored.id, {
          metadata: { name: restored.name },
        });
        return restored;
      }
      throw new ConflictException('Role already exists');
    }

    const role = await this.prisma.role.create({ data: dto });
    await this.auditService.log('RBAC_CREATE_ROLE', 'Role', role.id, {
      metadata: { name: role.name },
    });
    return role;
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findFirst({
      where: { id, deletedAt: null },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    try {
      const updated = await this.prisma.role.update({
        where: { id },
        data: dto,
      });
      await this.auditService.log('RBAC_UPDATE_ROLE', 'Role', updated.id, {
        metadata: { name: updated.name },
      });
      return updated;
    } catch (error) {
      this.handleUnique(error, 'Role already exists');
    }
  }

  async createPermission(dto: CreatePermissionDto) {
    const existing = await this.prisma.permission.findFirst({
      where: { key: dto.key },
    });
    if (existing) {
      if (existing.deletedAt) {
        const restored = await this.prisma.permission.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            description: dto.description ?? existing.description,
          },
        });
        await this.auditService.log(
          'RBAC_RESTORE_PERMISSION',
          'Permission',
          restored.id,
          {
            metadata: { key: restored.key },
          },
        );
        return restored;
      }
      throw new ConflictException('Permission already exists');
    }
    const permission = await this.prisma.permission.create({ data: dto });
    await this.auditService.log(
      'RBAC_CREATE_PERMISSION',
      'Permission',
      permission.id,
      {
        metadata: { key: permission.key },
      },
    );
    return permission;
  }

  async updatePermission(id: string, dto: UpdatePermissionDto) {
    const permission = await this.prisma.permission.findFirst({
      where: { id, deletedAt: null },
    });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    try {
      const updated = await this.prisma.permission.update({
        where: { id },
        data: dto,
      });
      await this.auditService.log(
        'RBAC_UPDATE_PERMISSION',
        'Permission',
        updated.id,
        {
          metadata: { key: updated.key },
        },
      );
      return updated;
    } catch (error) {
      this.handleUnique(error, 'Permission already exists');
    }
  }

  async assignPermissions(roleId: string, dto: AssignPermissionsDto) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, deletedAt: null },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permissionKeys = Array.from(
      new Set(
        dto.permissions.map((permission) => permission.trim()).filter(Boolean),
      ),
    );

    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys }, deletedAt: null },
    });

    if (permissions.length !== permissionKeys.length) {
      throw new BadRequestException('Some permissions do not exist');
    }

    await this.prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });

    await this.auditService.log('RBAC_ASSIGN_PERMISSIONS', 'Role', role.id, {
      metadata: { permissions: permissionKeys },
    });

    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async replacePermissions(roleId: string, dto: AssignPermissionsDto) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, deletedAt: null },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permissionKeys = Array.from(
      new Set(
        dto.permissions.map((permission) => permission.trim()).filter(Boolean),
      ),
    );

    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys }, deletedAt: null },
    });

    if (permissions.length !== permissionKeys.length) {
      throw new BadRequestException('Some permissions do not exist');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId,
            permissionId: permission.id,
          })),
        });
      }
    });

    await this.auditService.log('RBAC_REPLACE_PERMISSIONS', 'Role', role.id, {
      metadata: { permissions: permissionKeys },
    });

    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async assignRolesToUser(userId: string, dto: AssignRolesDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roleNames = Array.from(
      new Set(dto.roles.map((role) => role.trim()).filter(Boolean)),
    );

    const roles = await this.prisma.role.findMany({
      where: { name: { in: roleNames }, deletedAt: null },
    });
    if (roles.length !== roleNames.length) {
      throw new BadRequestException('Some roles do not exist');
    }

    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({ userId: user.id, roleId: role.id })),
      skipDuplicates: true,
    });

    await this.auditService.log('RBAC_ASSIGN_ROLE', 'User', user.id, {
      userId: user.id,
      metadata: { roles: roleNames },
    });

    return this.prisma.user.findUnique({
      where: { id: user.id },
      include: { roles: { include: { role: true } } },
    });
  }

  async replaceRolesForUser(userId: string, dto: AssignRolesDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roleNames = Array.from(
      new Set(dto.roles.map((role) => role.trim()).filter(Boolean)),
    );

    const roles = await this.prisma.role.findMany({
      where: { name: { in: roleNames }, deletedAt: null },
    });
    if (roles.length !== roleNames.length) {
      throw new BadRequestException('Some roles do not exist');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: user.id } });
      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((role) => ({ userId: user.id, roleId: role.id })),
        });
      }
    });

    await this.auditService.log('RBAC_REPLACE_ROLE', 'User', user.id, {
      userId: user.id,
      metadata: { roles: roleNames },
    });

    return this.prisma.user.findUnique({
      where: { id: user.id },
      include: { roles: { include: { role: true } } },
    });
  }

  async assignRolesToUserByDni(dni: string, dto: AssignRolesDto) {
    const user = await this.prisma.user.findFirst({
      where: { dni, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roleNames = Array.from(
      new Set(dto.roles.map((role) => role.trim()).filter(Boolean)),
    );

    const roles = await this.prisma.role.findMany({
      where: { name: { in: roleNames }, deletedAt: null },
    });
    if (roles.length !== roleNames.length) {
      throw new BadRequestException('Some roles do not exist');
    }

    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({ userId: user.id, roleId: role.id })),
      skipDuplicates: true,
    });

    await this.auditService.log('RBAC_ASSIGN_ROLE', 'User', user.id, {
      userId: user.id,
      metadata: { roles: roleNames },
    });

    return this.prisma.user.findUnique({
      where: { id: user.id },
      include: { roles: { include: { role: true } } },
    });
  }

  async replaceRolesForUserByDni(dni: string, dto: AssignRolesDto) {
    const user = await this.prisma.user.findFirst({
      where: { dni, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.replaceRolesForUser(user.id, dto);
  }

  async deleteRole(id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, deletedAt: null },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    await this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.auditService.log('RBAC_DELETE_ROLE', 'Role', role.id, {
      metadata: { name: role.name },
    });
    return { success: true };
  }

  async deletePermission(id: string) {
    const permission = await this.prisma.permission.findFirst({
      where: { id, deletedAt: null },
    });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    await this.prisma.permission.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.auditService.log(
      'RBAC_DELETE_PERMISSION',
      'Permission',
      permission.id,
      {
        metadata: { key: permission.key },
      },
    );
    return { success: true };
  }

  private handleUnique(error: unknown, message: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
    throw error;
  }
}
