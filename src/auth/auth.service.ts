import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { parseDurationToSeconds } from '../common/utils/date.util';
import { PrismaService } from '../prisma/prisma.service';
import { sha256 } from '../common/utils/hash.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private userWithPermissionsInclude = {
    roles: {
      where: { role: { deletedAt: null } },
      include: {
        role: {
          include: {
            permissions: {
              where: { permission: { deletedAt: null } },
              include: { permission: true },
            },
          },
        },
      },
    },
  } as const;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(dto.password);
    const chapter = await this.prisma.chapter.findUnique({ where: { id: dto.chapterId } });
    if (!chapter || chapter.deletedAt) {
      throw new BadRequestException('Invalid chapter');
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

      // Assign default member role if it exists
      const memberRole = await this.prisma.role.findUnique({ where: { name: 'Member' } });
      if (memberRole) {
        await this.prisma.userRole.create({
          data: { roleId: memberRole.id, userId: user.id },
        });
      }

      await this.auditService.log('USER_REGISTER', 'User', user.id, {});

      return {
        id: user.id,
        dni: user.dni,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        chapterId: user.chapterId,
      };
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        throw new ConflictException('User already exists');
      }
      throw error;
    }
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { dni: dto.dni } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive || user.deletedAt) {
      const reason = user.statusReason ? `: ${user.statusReason}` : '';
      throw new ForbiddenException(`User is inactive${reason}`);
    }

    const passwordMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionTtlSeconds = parseDurationToSeconds(this.configService.get<string>('JWT_EXPIRES_IN'));

    const result = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
        await tx.session.deleteMany({ where: { userId: user.id } });

        const payload: JwtPayload = { sub: user.id, dni: user.dni };
        const token = await this.jwtService.signAsync(payload, {
          secret: this.configService.get<string>('JWT_SECRET') ?? 'dev-secret',
          expiresIn: sessionTtlSeconds,
        });

        const decoded = this.jwtService.decode(token) as JwtPayload & { exp?: number };
        const expiresAt = decoded?.exp
          ? new Date(decoded.exp * 1000)
          : new Date(Date.now() + sessionTtlSeconds * 1000);
        const tokenHash = sha256(token);

        await tx.session.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
            ipHash: ip ? sha256(ip) : undefined,
            userAgent,
            lastUsedAt: new Date(),
          },
        });

        return { token };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.auditService.log('LOGIN', 'User', user.id, {
      userId: user.id,
      ipHash: ip ? sha256(ip) : undefined,
      metadata: { userAgent },
    });

    const userWithRbac = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: this.userWithPermissionsInclude,
    });
    const roles = userWithRbac?.roles.map((r) => r.role.name) ?? [];
    const permissions = Array.from(
      new Set(
        userWithRbac?.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key)) ?? [],
      ),
    );

    return {
      accessToken: result.token,
      userId: user.id,
      user: {
        id: user.id,
        dni: user.dni,
        firstName: user.firstName,
        lastName: user.lastName,
        chapterId: user.chapterId,
        roles,
        permissions,
      },
    };
  }

  async logout(rawToken?: string, userId?: string) {
    if (!rawToken) {
      throw new BadRequestException('Missing token');
    }
    const tokenHash = sha256(rawToken);
    await this.prisma.session.deleteMany({ where: { tokenHash } });

    if (userId) {
      await this.auditService.log('LOGOUT', 'User', userId, { userId });
    }

    return { success: true };
  }

  async validateTokenSession(
    payload: JwtPayload,
    token: string,
  ): Promise<
    Prisma.UserGetPayload<{
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } };
      };
    }>
  > {
    const tokenHash = sha256(token);
    const session = await this.prisma.session.findUnique({ where: { tokenHash } });
    if (!session) {
      throw new UnauthorizedException('Session expired');
    }
    if (session.expiresAt < new Date()) {
      await this.prisma.session.deleteMany({ where: { tokenHash } });
      throw new UnauthorizedException('Session expired');
    }
    if (session.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: this.userWithPermissionsInclude,
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    await this.prisma.session.update({
      where: { tokenHash },
      data: { lastUsedAt: new Date() },
    });

    return user;
  }

  private isUniqueConstraint(error: unknown): boolean {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      return (error as Prisma.PrismaClientKnownRequestError).code === 'P2002';
    }
    return false;
  }
}
