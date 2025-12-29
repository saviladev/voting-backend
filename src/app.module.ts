import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RbacModule } from './rbac/rbac.module';
import { AssociationsModule } from './associations/associations.module';
import { BranchesModule } from './branches/branches.module';
import { ChaptersModule } from './chapters/chapters.module';
import { PartiesModule } from './parties/parties.module';
import { SpecialtiesModule } from './specialties/specialties.module';
import { PadronModule } from './padron/padron.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    RbacModule,
    AssociationsModule,
    BranchesModule,
    ChaptersModule,
    PartiesModule,
    SpecialtiesModule,
    PadronModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
