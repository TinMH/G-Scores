import 'dotenv/config';
import { Client } from 'pg';
import { STUDENTS } from './fixtures';

/**
 * Builds a throwaway database: create it if missing, run the real migrations,
 * load fixtures and rebuild the stats table exactly as the seeder does.
 */
export default async function globalSetup() {
  const dbName = process.env.TEST_DB_NAME ?? 'gscores_test';
  process.env.DB_NAME = dbName;
  if (!dbName.includes('test')) {
    throw new Error(`Refusing to reset database "${dbName}": name must contain "test"`);
  }

  const admin = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'gscores',
    password: process.env.DB_PASSWORD ?? 'gscores',
    database: 'postgres',
  });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!exists.rowCount) await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  // Imported after DB_NAME is set: database.config reads process.env at import time.
  const { AppDataSource } = await import('../src/database/data-source');
  const { refreshStats } = await import('../src/database/stats');

  await AppDataSource.initialize();
  try {
    await AppDataSource.dropDatabase(); // clears tables + migrations history
    await AppDataSource.runMigrations({ transaction: 'each' });

    const cols = ['sbd', 'toan', 'ngu_van', 'ngoai_ngu', 'vat_li', 'hoa_hoc', 'sinh_hoc', 'lich_su', 'dia_li', 'gdcd', 'ma_ngoai_ngu'] as const;
    for (const s of STUDENTS) {
      await AppDataSource.query(
        `INSERT INTO students (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`,
        cols.map((c) => s[c] ?? null),
      );
    }
    await refreshStats(AppDataSource.manager);
  } finally {
    await AppDataSource.destroy();
  }
}
