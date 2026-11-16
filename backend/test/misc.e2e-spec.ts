import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers';

describe('Health, subjects and rate limiting', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await createTestApp()));
  afterAll(async () => app.close());

  it('GET /api/health reports ok when the database is reachable', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(body).toEqual({ status: 'ok' });
  });

  it('GET /api/subjects lists subjects and groups from the registry', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/subjects').expect(200);
    expect(body.subjects).toHaveLength(9);
    expect(body.groups.map((g: any) => g.code)).toEqual(['A00', 'A01', 'B00', 'C00', 'D01']);
  });

  it('unknown routes return 404', async () => {
    await request(app.getHttpServer()).get('/api/nope').expect(404);
  });

  it('throttles after 60 requests per minute but never the health probe', async () => {
    const server = app.getHttpServer();
    // The previous tests already used 2 of this app instance's 60 allowed requests.
    let limited = 0;
    for (let i = 0; i < 62; i++) {
      const res = await request(server).get('/api/subjects');
      if (res.status === 429) limited++;
    }
    expect(limited).toBeGreaterThan(0);
    await request(server).get('/api/health').expect(200);
  });
});
