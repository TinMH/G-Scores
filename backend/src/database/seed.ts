import { createReadStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { PoolClient } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { AppDataSource } from './data-source';
import { refreshStats } from './stats';

const CSV_COLUMNS =
  'sbd, toan, ngu_van, ngoai_ngu, vat_li, hoa_hoc, sinh_hoc, lich_su, dia_li, gdcd, ma_ngoai_ngu';

/**
 * Bulk-load the raw CSV with Postgres COPY (≈1M rows in seconds; ORM inserts would take minutes).
 * Idempotent: skips when data exists unless `--force` is passed.
 */
async function main() {
  const force = process.argv.includes('--force');
  const csvPath = resolve(process.env.DATASET_PATH ?? '../dataset/diem_thi_thpt_2024.csv');
  if (!existsSync(csvPath)) throw new Error(`Dataset not found: ${csvPath}`);

  await AppDataSource.initialize();
  const [{ count }] = await AppDataSource.query(`SELECT COUNT(*)::int AS count FROM students`);
  if (count > 0 && !force) {
    console.log(`students already has ${count} rows — skipping (use --force to reload)`);
    // Databases seeded before overview_stats existed: build the missing stats without reloading 1M rows.
    const [{ n }] = await AppDataSource.query(`SELECT COUNT(*)::int AS n FROM overview_stats`);
    if (n === 0) {
      await refreshStats(AppDataSource.manager);
      console.log("overview_stats was empty — rebuilt");
    }
    return AppDataSource.destroy();
  }

  const started = Date.now();
  const qr = AppDataSource.createQueryRunner();
  const client = (await qr.connect()) as PoolClient; // raw pg client, needed for COPY
  try {
    await qr.startTransaction();
    await qr.query(`TRUNCATE students`);
    // Unquoted empty CSV fields become NULL, so missing subjects load as NULL directly.
    const copy = client.query(copyFrom(`COPY students (${CSV_COLUMNS}) FROM STDIN WITH (FORMAT csv, HEADER true)`));
    await pipeline(createReadStream(csvPath), copy);
    await qr.commitTransaction();
    console.log(`Loaded ${copy.rowCount} rows in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }

  await AppDataSource.query(`ANALYZE students`);
  await refreshStats(AppDataSource.manager);
  console.log(`Stats refreshed — total ${((Date.now() - started) / 1000).toFixed(1)}s`);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
