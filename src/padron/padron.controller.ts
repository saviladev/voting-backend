import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import type { RequestUser } from '../common/interfaces/request-user.interface';
type PadronFile = {
  buffer: Buffer;
  originalname: string;
  size?: number;
};
import { PadronService } from './padron.service';

@ApiTags('padron')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('padron')
export class PadronController {
  constructor(private padronService: PadronService) {}

  @Permissions('padron.manage')
  @Post('import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
          return callback(new BadRequestException('Only .xlsx files are allowed'), false);
        }
        callback(null, true);
      },
    }),
  )
  import(@UploadedFile() file: PadronFile, @CurrentUser() user: RequestUser) {
    return this.padronService.importPadron(file, user.id, user.roles, 'IMPORT');
  }

  @Permissions('padron.manage')
  @Post('disable')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
          return callback(new BadRequestException('Only .xlsx files are allowed'), false);
        }
        callback(null, true);
      },
    }),
  )
  disable(@UploadedFile() file: PadronFile, @CurrentUser() user: RequestUser) {
    return this.padronService.importPadron(file, user.id, user.roles, 'DISABLE');
  }
}
