import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers';

describe('GET /api/students/:sbd', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await createTestApp()));
  afterAll(async () => app.close());

  it('returns every subject with score and level, plus group totals', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/students/01000001').expect(200);

    expect(body.sbd).toBe('01000001');
    expect(body.foreignLanguage).toBe('Tiếng Anh');
    expect(body.scores).toHaveLength(9);

    const byCode = Object.fromEntries(body.scores.map((s: any) => [s.subject.code, s]));
    expect(byCode.toan).toMatchObject({ score: 8.4, level: 'excellent' });
    expect(byCode.ngu_van).toMatchObject({ score: 6.75, level: 'good' });
    expect(byCode.hoa_hoc).toMatchObject({ score: 5.25, level: 'average' });
    expect(byCode.sinh_hoc).toMatchObject({ score: null, level: null }); // did not take the exam

    const totals = Object.fromEntries(body.groups.map((g: any) => [g.code, g.total]));
    expect(totals).toEqual({ A00: 19.65, A01: 22.4, D01: 23.15 }); // B00 / C00 omitted: missing subjects
  });

  it('computes different groups for a social-science student', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/students/01000002').expect(200);
    const codes = body.groups.map((g: any) => g.code);
    expect(codes).toEqual(expect.arrayContaining(['C00', 'D01']));
    expect(codes).not.toContain('A00');
  });

  it('trims surrounding whitespace in the registration number', async () => {
    await request(app.getHttpServer()).get('/api/students/%2001000001%20').expect(200);
  });

  it.each(['abc', '1234567', '123456789', '0100000a'])('rejects malformed sbd "%s" with 400', async (sbd) => {
    const { body } = await request(app.getHttpServer()).get(`/api/students/${sbd}`).expect(400);
    expect(body.message).toContain('Số báo danh phải gồm đúng 8 chữ số');
  });

  it('returns 404 for an unknown registration number', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/students/99999999').expect(404);
    expect(body.message).toContain('99999999');
  });
});
