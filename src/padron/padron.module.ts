import { Module } from '@nestjs/common';
import { PadronController } from './padron.controller';
import { PadronService } from './padron.service';
import { MailService } from '../notifications/mail.service';

@Module({
  controllers: [PadronController],
  providers: [PadronService, MailService],
})
export class PadronModule {}
