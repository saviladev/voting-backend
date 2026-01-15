import { BadRequestException, Injectable } from '@nestjs/common';
type PadronFile = {
  buffer: Buffer;
  originalname: string;
  size?: number;
};
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../notifications/mail.service';
import * as argon2 from 'argon2';
import * as XLSX from 'xlsx';
import { randomInt } from 'crypto';
import {
  PadronImportResultDto,
  PadronImportSkippedDetail,
} from './dto/padron-import-result.dto';

interface PadronRow {
  dni: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  branchName?: string;
  chapterName?: string;
  isPaidUp?: boolean;
}

const MAX_PADRON_ROWS = 5000;

const HEADER_ALIASES: Record<keyof PadronRow, string[]> = {
  dni: ['dni'],
  firstName: ['firstname', 'nombres', 'name'],
  lastName: ['lastname', 'apellidos', 'surname'],
  email: ['email', 'correo'],
  phone: ['phone', 'telefono', 'celular'],
  branchName: ['branchname', 'sede', 'branch'],
  chapterName: ['chaptername', 'capitulo', 'chapter'],
  isPaidUp: [
    'ispaidup',
    'pagosaldia',
    'aldiam',
    'aldia',
    'activo',
    'habilitado',
  ],
};

@Injectable()
export class PadronService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async importPadron(
    file: PadronFile,
    adminUserId: string,
    roles: string[],
  ): Promise<PadronImportResultDto> {
    if (!file?.buffer) {
      throw new BadRequestException('Missing file');
    }

    const admin = await this.prisma.user.findFirst({
      where: { id: adminUserId, deletedAt: null },
      include: { chapter: { include: { branch: true } } },
    });
    if (!admin) {
      throw new BadRequestException('Admin user not found');
    }

    const isSystemAdmin = roles.includes('SystemAdmin');
    const adminBranchName = admin.chapter.branch.name.trim().toLowerCase();
    const adminChapterName = admin.chapter.name.trim().toLowerCase();

    const rows = this.parseWorkbook(file.buffer);
    if (rows.length === 0) {
      throw new BadRequestException('No rows found in file');
    }

    const result: PadronImportResultDto = {
      created: 0,
      updated: 0,
      disabled: 0,
      skipped: 0,
      rejected: [],
      skippedDetails: [],
    };

    for (const row of rows) {
      const dni = row.dni?.trim();
      if (!dni || dni.length !== 8) {
        result.skipped += 1;
        this.addSkippedDetail(result, row.dni, 'DNI inválido');
        continue;
      }

      const branchName = row.branchName?.trim().toLowerCase();
      const chapterName = row.chapterName?.trim().toLowerCase();
      if (!branchName || !chapterName) {
        result.skipped += 1;
        this.addSkippedDetail(result, dni, 'Falta sede o capítulo');
        continue;
      }

      let chapterId: string | null = null;

      if (isSystemAdmin) {
        const chapter = await this.prisma.chapter.findFirst({
          where: {
            deletedAt: null,
            name: {
              equals: row.chapterName?.trim() ?? '',
              mode: 'insensitive',
            },
            branch: {
              deletedAt: null,
              name: {
                equals: row.branchName?.trim() ?? '',
                mode: 'insensitive',
              },
            },
          },
        });
        if (!chapter) {
          result.skipped += 1;
          this.addSkippedDetail(result, dni, 'No existe la sede o capítulo');
          continue;
        }
        chapterId = chapter.id;
      } else {
        if (
          branchName !== adminBranchName ||
          chapterName !== adminChapterName
        ) {
          result.rejected.push(
            this.formatRejected(row, 'Capítulo fuera de tu alcance'),
          );
          continue;
        }
        chapterId = admin.chapterId;
      }

      const isPaidUp = row.isPaidUp;
      if (isPaidUp === undefined) {
        result.skipped += 1;
        this.addSkippedDetail(result, dni, 'Falta el estado de pagos al día');
        continue;
      }
      const isActive = isPaidUp;

      const existing = await this.prisma.user.findUnique({ where: { dni } });

      if (existing) {
        const wasActive = existing.isActive;
        await this.prisma.user.update({
          where: { dni },
          data: {
            firstName: row.firstName ?? existing.firstName,
            lastName: row.lastName ?? existing.lastName,
            email: row.email ?? existing.email,
            phone: row.phone ?? existing.phone,
            chapterId: chapterId ?? existing.chapterId,
            isActive,
            deletedAt: null,
          },
        });
        result.updated += 1;
        if (wasActive && !isActive) {
          await this.prisma.session.deleteMany({
            where: { userId: existing.id },
          });
          result.disabled += 1;
        }
        if (wasActive !== isActive) {
          const emailTarget = row.email ?? existing.email;
          if (emailTarget) {
            await this.mailService.sendAccountStatusChangeEmail({
              to: emailTarget,
              fullName: this.formatName(row, existing),
              isActive,
            });
          }
        }
      } else {
        const tempPassword = this.generatePassword();
        const passwordHash = await argon2.hash(tempPassword);
        const email = row.email ?? `${dni}@example.com`;
        const phone = row.phone ?? `tmp-${dni}`;
        try {
          const user = await this.prisma.user.create({
            data: {
              dni,
              passwordHash,
              firstName: row.firstName ?? 'Pendiente',
              lastName: row.lastName ?? 'Pendiente',
              email,
              phone,
              chapterId: chapterId ?? admin.chapterId,
              isActive,
            },
          });
          const memberRole = await this.prisma.role.findFirst({
            where: { name: 'Member', deletedAt: null },
          });
          if (memberRole) {
            await this.prisma.userRole.create({
              data: {
                userId: user.id,
                roleId: memberRole.id,
              },
            });
          }
          result.created += 1;
          if (isActive === false) {
            result.disabled += 1;
          }
          if (row.email) {
            await this.mailService.sendAccountStatusEmail({
              to: row.email,
              fullName: this.formatName(row),
              dni,
              isActive,
              tempPassword,
            });
          }
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            result.skipped += 1;
            this.addSkippedDetail(result, dni, 'Correo o teléfono duplicado');
            continue;
          }
          throw error;
        }
      }
    }

    if (result.rejected.length > 0) {
      result.message = `Estos usuarios no pudieron registrarse porque sus capítulos no te corresponden: ${result.rejected.join(', ')}`;
    }

    return result;
  }

  private parseWorkbook(buffer: Buffer): PadronRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return [];
    }
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<
      Record<string, string | number | boolean>
    >(sheet, {
      defval: '',
    });
    if (json.length > MAX_PADRON_ROWS) {
      throw new BadRequestException(`File exceeds ${MAX_PADRON_ROWS} rows`);
    }

    return json.map((row) => this.mapRow(row)).filter((row) => row.dni);
  }

  private mapRow(raw: Record<string, string | number | boolean>): PadronRow {
    const normalized: Record<string, string> = {};
    Object.entries(raw).forEach(([key, value]) => {
      const normalizedKey = key
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s|_/g, '');
      normalized[normalizedKey] = String(value ?? '').trim();
    });

    const getValue = (field: keyof PadronRow): string => {
      const aliases = HEADER_ALIASES[field];
      for (const alias of aliases) {
        if (alias in normalized) {
          return normalized[alias];
        }
      }
      return '';
    };

    const isPaidUpRaw = getValue('isPaidUp');
    return {
      dni: getValue('dni'),
      firstName: getValue('firstName') || undefined,
      lastName: getValue('lastName') || undefined,
      email: getValue('email') || undefined,
      phone: getValue('phone') || undefined,
      branchName: getValue('branchName') || undefined,
      chapterName: getValue('chapterName') || undefined,
      isPaidUp: this.parseBoolean(isPaidUpRaw),
    };
  }

  private parseBoolean(value: string): boolean | undefined {
    if (!value) {
      return undefined;
    }
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'si', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
    return undefined;
  }

  private formatRejected(row: PadronRow, reason?: string): string {
    const fullName = [row.firstName, row.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const suffix = reason ? ` (${reason})` : '';
    if (fullName) {
      return `${fullName} - ${row.dni}${suffix}`;
    }
    return `${row.dni}${suffix}`;
  }

  private addSkippedDetail(
    result: PadronImportResultDto,
    dni: string | undefined,
    reason: string,
  ) {
    if (!result.skippedDetails) {
      result.skippedDetails = [];
    }
    if (result.skippedDetails.length >= 10) {
      return;
    }
    result.skippedDetails.push({
      dni,
      reason,
    } satisfies PadronImportSkippedDetail);
  }

  private formatName(
    row: PadronRow,
    fallback?: { firstName: string; lastName: string },
  ) {
    const firstName = row.firstName ?? fallback?.firstName ?? '';
    const lastName = row.lastName ?? fallback?.lastName ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'Colegiado';
  }

  private generatePassword(): string {
    let value = '';
    for (let i = 0; i < 12; i += 1) {
      value += randomInt(0, 10).toString();
    }
    return value;
  }
}
