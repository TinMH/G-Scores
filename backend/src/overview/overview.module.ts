import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SubjectOverviewRow, TopScorerRow } from '../database/stats';
import { SubjectRegistry } from '../subjects/domain/subject-registry';

@Injectable()
export class OverviewService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly registry: SubjectRegistry,
  ) {}

  /** Dashboard numbers, read from the pre-aggregated overview_stats table (3 tiny rows). */
  async get() {
    const rows: { key: string; value: unknown }[] = await this.dataSource.query(`SELECT key, value FROM overview_stats`);
    const doc = <T>(key: string, fallback: T): T => (rows.find((r) => r.key === key)?.value as T) ?? fallback;

    const totals = doc('totals', { candidates: 0, papers: 0, perfectScores: 0 });
    const subjectRows = doc<SubjectOverviewRow[]>('subjects', []);
    const scorers = doc<TopScorerRow[]>('group_top_scorers', []);

    const withGroup = (s: TopScorerRow) => {
      const group = this.registry.findGroup(s.group)!;
      return { group: { code: group.code, name: group.name }, sbd: s.sbd, total: s.total };
    };
    const groupTopScorers = scorers.filter((s) => this.registry.findGroup(s.group)).map(withGroup);
    // Overall top scorer = best total across all groups.
    const topScorer = groupTopScorers.reduce<(typeof groupTopScorers)[number] | null>(
      (best, s) => (best === null || s.total > best.total ? s : best),
      null,
    );

    return {
      totals,
      topScorer,
      groupTopScorers,
      subjects: this.registry.allSubjects().map((subject) => {
        const r = subjectRows.find((x) => x.code === subject.code);
        return {
          ...subject.toJSON(),
          taken: r?.taken ?? 0,
          average: r?.average ?? null,
          perfectScores: r?.perfect ?? 0,
        };
      }),
    };
  }
}

@Controller('overview')
export class OverviewController {
  constructor(private readonly service: OverviewService) {}

  @Get()
  get() {
    return this.service.get();
  }
}

@Module({ controllers: [OverviewController], providers: [OverviewService] })
export class OverviewModule {}
