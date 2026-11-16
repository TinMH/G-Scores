import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers';

describe('GET /api/rankings/:group', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await createTestApp()));
  afterAll(async () => app.close());

  it('lists group A00 by total descending, only students who took all three subjects', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/rankings/A00').expect(200);

    expect(body.group).toEqual({ code: 'A00', name: 'Khối A', subjects: ['toan', 'vat_li', 'hoa_hoc'] });
    expect(body.students.map((s: any) => [s.rank, s.sbd, s.total])).toEqual([
      [1, '01000003', 29.6],
      [2, '01000004', 29.55],
      [3, '01000001', 19.65],
      [4, '01000005', 8.5],
    ]);
    expect(body.students[0].scores).toEqual({ toan: 9.6, vat_li: 10, hoa_hoc: 10 });
  });

  it('honours the limit parameter', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/rankings/A00?limit=2').expect(200);
    expect(body.students.map((s: any) => s.sbd)).toEqual(['01000003', '01000004']);
  });

  it('accepts the group code case-insensitively', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/rankings/a00?limit=1').expect(200);
    expect(body.group.code).toBe('A00');
  });

  it('ranks other groups from their own subjects (A01 = Toán + Lý + Ngoại ngữ)', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/rankings/A01').expect(200);
    expect(body.students).toEqual([
      { rank: 1, sbd: '01000001', scores: { toan: 8.4, vat_li: 6, ngoai_ngu: 8 }, total: 22.4 },
    ]);
  });

  it('returns 404 for an unknown group', async () => {
    await request(app.getHttpServer()).get('/api/rankings/Z99').expect(404);
  });

  it.each(['0', '101', '-1', 'abc', '1.5'])('rejects limit=%s with 400', async (limit) => {
    await request(app.getHttpServer()).get(`/api/rankings/A00?limit=${limit}`).expect(400);
  });

  it('rejects unknown query parameters', async () => {
    await request(app.getHttpServer()).get('/api/rankings/A00?offset=5').expect(400);
  });
});
