import { Controller, Get, Injectable, Module, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { DataSource } from 'typeorm';
import { SubjectRegistry } from '../subjects/domain/subject-registry';

export class TopQueryDto {
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}

@Injectable()
export class RankingsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly registry: SubjectRegistry,
  ) {}

  async top(groupCode: string, limit: number) {
    const group = this.registry.findGroup(groupCode);
    if (!group) throw new NotFoundException(`Không có khối ${groupCode}`);

    // Column names come from the registry (never user input); limit is parameterised.
    const expr = group.sqlTotalExpression;
    const cols = group.subjects.map((s) => s.column).join(', ');
    const rows: Record<string, string>[] = await this.dataSource.query(
      `SELECT sbd, ${cols}, ${expr} AS total
       FROM students
       WHERE ${expr} IS NOT NULL
       ORDER BY ${expr} DESC, sbd
       LIMIT $1`,
      [limit],
    );

    return {
      group: group.toJSON(),
      students: rows.map((r, i) => ({
        rank: i + 1,
        sbd: r.sbd,
        scores: Object.fromEntries(group.subjects.map((s) => [s.code, Number(r[s.column])])),
        total: Number(r.total),
      })),
    };
  }
}

@Controller('rankings')
export class RankingsController {
  constructor(private readonly service: RankingsService) {}

  @Get(':group')
  top(@Param('group') group: string, @Query() { limit }: TopQueryDto) {
    return this.service.top(group, limit);
  }
}

@Module({ controllers: [RankingsController], providers: [RankingsService] })
export class RankingsModule {}
