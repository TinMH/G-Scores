import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers';

describe('GET /api/reports/score-levels', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await createTestApp()));
  afterAll(async () => app.close());

  async function fetchReport() {
    const { body } = await request(app.getHttpServer()).get('/api/reports/score-levels').expect(200);
    return {
      body,
      counts: Object.fromEntries(body.subjects.map((s: any) => [s.code, s.counts])) as Record<
        string,
        Record<string, number>
      >,
    };
  }

  it('describes the four levels and covers all nine subjects', async () => {
    const { body } = await fetchReport();
    expect(body.levels.map((l: any) => l.level)).toEqual(['excellent', 'good', 'average', 'poor']);
    expect(body.subjects.map((s: any) => s.code)).toEqual([
      'toan', 'ngu_van', 'ngoai_ngu', 'vat_li', 'hoa_hoc', 'sinh_hoc', 'lich_su', 'dia_li', 'gdcd',
    ]);
  });

  it('puts boundary scores in the right level (8 → >=8, 7.99 → 6-8, 6 → 6-8, 4 → 4-6, <4 → poor)', async () => {
    const { counts } = await fetchReport();
    // Toán: 8.4, 8.6, 9.6, 9.8, 8 | 6, 7.99 | 4 | 3
    expect(counts.toan).toEqual({ excellent: 5, good: 2, average: 1, poor: 1 });
  });

  it('counts other subjects and ignores students who skipped them', async () => {
    const { counts } = await fetchReport();
    expect(counts.hoa_hoc).toEqual({ excellent: 2, good: 0, average: 1, poor: 1 }); // 10, 10 | 5.25 | 2
    expect(counts.vat_li).toEqual({ excellent: 2, good: 1, average: 0, poor: 1 }); // 10, 9.75 | 6 | 3.5
    expect(counts.gdcd).toEqual({ excellent: 1, good: 0, average: 0, poor: 0 });
    expect(counts.sinh_hoc).toEqual({ excellent: 0, good: 0, average: 0, poor: 0 });
  });
});
