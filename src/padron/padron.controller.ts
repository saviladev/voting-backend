import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Importar padrón (crea, actualiza, activa/desactiva según isPaidUp)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
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
    return this.padronService.importPadron(file, user.id, user.roles);
  }

  // /padron/disable removido: el flujo se unifica en /padron/import con isPaidUp.
}
