import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SCORE_LEVELS } from '../subjects/domain/score-level';
import { SubjectRegistry } from '../subjects/domain/subject-registry';
import { SubjectScoreStat } from './subject-score-stat.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(SubjectScoreStat) private readonly repo: Repository<SubjectScoreStat>,
    private readonly registry: SubjectRegistry,
  ) {}

  /** Counts per subject × level, read from the pre-aggregated table (~36 rows). */
  async scoreLevels() {
    const rows = await this.repo.find();
    const count = (subject: string, level: string) =>
      rows.find((r) => r.subject_code === subject && r.level === level)?.total ?? 0;

    return {
      levels: SCORE_LEVELS.map(({ level, label }) => ({ level, label })),
      subjects: this.registry.allSubjects().map((s) => ({
        ...s.toJSON(),
        counts: Object.fromEntries(SCORE_LEVELS.map(({ level }) => [level, count(s.code, level)])),
      })),
    };
  }
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('score-levels')
  scoreLevels() {
    return this.service.scoreLevels();
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([SubjectScoreStat])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
