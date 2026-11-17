import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { HealthController } from './health/health.controller';
import { OverviewModule } from './overview/overview.module';
import { RankingsModule } from './rankings/rankings.module';
import { ReportsModule } from './reports/reports.module';
import { StudentsModule } from './students/students.module';
import { SubjectsModule } from './subjects/subjects.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({ ...databaseConfig, migrationsRun: false }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]), // 60 req/min per IP
    SubjectsModule,
    StudentsModule,
    ReportsModule,
    RankingsModule,
    OverviewModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
