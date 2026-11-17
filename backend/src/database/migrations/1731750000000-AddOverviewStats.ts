import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pre-aggregated numbers for the Dashboard (totals, per-subject averages, top scorers).
 * Small JSON documents keyed by name, rebuilt by refreshStats() after seeding.
 */
export class AddOverviewStats1731750000000 implements MigrationInterface {
  name = 'AddOverviewStats1731750000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE overview_stats (
        key   VARCHAR(32) PRIMARY KEY,
        value JSONB NOT NULL
      )`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE overview_stats`);
  }
}
