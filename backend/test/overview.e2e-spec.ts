import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers';

/**
 * Expected values are hand-computed from test/fixtures.ts (9 candidates):
 *  - papers  = 5 + 6 + 3 + 3 + 3 + 4 single-Toán rows = 24 non-empty scores
 *  - perfect = 10s: 01000003 (Lý, Hoá) + 01000004 (Hoá) = 3
 *  - Toán average = 65.39 / 9 = 7.27 ; Lý = 29.25 / 4 = 7.31 ; Hoá = 27.25 / 4 = 6.81
 */
describe('GET /api/overview', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await createTestApp()));
  afterAll(async () => app.close());

  const fetchOverview = async () => (await request(app.getHttpServer()).get('/api/overview').expect(200)).body;

  it('returns dataset totals', async () => {
    const { totals } = await fetchOverview();
    expect(totals).toEqual({ candidates: 9, papers: 24, perfectScores: 3 });
  });

  it('returns the overall top scorer (best total across all groups)', async () => {
    const { topScorer } = await fetchOverview();
    expect(topScorer).toEqual({ group: { code: 'A00', name: 'Khối A' }, sbd: '01000003', total: 29.6 });
  });

  it('returns the top scorer of each group that has any, in registry order', async () => {
    const { groupTopScorers } = await fetchOverview();
    expect(groupTopScorers.map((s: any) => [s.group.code, s.sbd, s.total])).toEqual([
      ['A00', '01000003', 29.6],
      ['A01', '01000001', 22.4],
      // B00 omitted: nobody took Sinh học
      ['C00', '01000002', 21.75],
      ['D01', '01000002', 24.3],
    ]);
  });

  it('returns per-subject taken / average / perfect scores for all nine subjects', async () => {
    const { subjects } = await fetchOverview();
    expect(subjects.map((s: any) => s.code)).toEqual([
      'toan', 'ngu_van', 'ngoai_ngu', 'vat_li', 'hoa_hoc', 'sinh_hoc', 'lich_su', 'dia_li', 'gdcd',
    ]);

    const by = Object.fromEntries(subjects.map((s: any) => [s.code, s]));
    expect(by.toan).toMatchObject({ name: 'Toán', taken: 9, average: 7.27, perfectScores: 0 });
    expect(by.vat_li).toMatchObject({ taken: 4, average: 7.31, perfectScores: 1 });
    expect(by.hoa_hoc).toMatchObject({ taken: 4, average: 6.81, perfectScores: 2 });
    expect(by.gdcd).toMatchObject({ taken: 1, average: 8, perfectScores: 0 });
  });

  it('gives null average (not NaN/0) for a subject nobody took', async () => {
    const { subjects } = await fetchOverview();
    expect(subjects.find((s: any) => s.code === 'sinh_hoc')).toMatchObject({ taken: 0, average: null, perfectScores: 0 });
  });

  it('is consistent with the score-levels report (papers = sum of all level counts)', async () => {
    const overview = await fetchOverview();
    const { body: report } = await request(app.getHttpServer()).get('/api/reports/score-levels').expect(200);
    const sumOfLevels = report.subjects.reduce(
      (sum: number, s: any) => sum + Object.values<number>(s.counts).reduce((a, b) => a + b, 0),
      0,
    );
    expect(overview.totals.papers).toBe(sumOfLevels);
  });
});
