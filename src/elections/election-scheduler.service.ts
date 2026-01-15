import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ElectionSchedulerService {
  private readonly logger = new Logger(ElectionSchedulerService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleElectionStatusUpdates() {
    const now = new Date();

    try {
      // Auto-open elections: DRAFT -> OPEN when startDate has arrived
      const electionsToOpen = await this.prisma.election.findMany({
        where: {
          status: 'DRAFT',
          startDate: {
            lte: now,
          },
        },
      });

      for (const election of electionsToOpen) {
        await this.prisma.election.update({
          where: { id: election.id },
          data: { status: 'OPEN' },
        });
        this.logger.log(
          `Auto-opened election: ${election.name} (${election.id})`,
        );
      }

      // Auto-close elections: OPEN -> CLOSED when endDate has passed
      const electionsToClose = await this.prisma.election.findMany({
        where: {
          status: 'OPEN',
          endDate: {
            lte: now,
          },
        },
      });

      for (const election of electionsToClose) {
        await this.prisma.election.update({
          where: { id: election.id },
          data: { status: 'CLOSED' },
        });
        this.logger.log(
          `Auto-closed election: ${election.name} (${election.id})`,
        );
      }

      if (electionsToOpen.length > 0 || electionsToClose.length > 0) {
        this.logger.log(
          `Election status check: ${electionsToOpen.length} opened, ${electionsToClose.length} closed`,
        );
      }
    } catch (error) {
      this.logger.error('Error updating election statuses', error);
    }
  }
}
