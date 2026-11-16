import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Group total expressions — must match SubjectGroup.sqlTotalExpression exactly,
 * otherwise Postgres won't use the index for ranking queries.
 */
const GROUP_TOTALS: [string, string][] = [
  ['a00', '(toan + vat_li + hoa_hoc)'],
  ['a01', '(toan + vat_li + ngoai_ngu)'],
  ['b00', '(toan + hoa_hoc + sinh_hoc)'],
  ['c00', '(ngu_van + lich_su + dia_li)'],
  ['d01', '(toan + ngu_van + ngoai_ngu)'],
];

export class Init1731740000000 implements MigrationInterface {
  name = 'Init1731740000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE students (
        sbd          CHAR(8) PRIMARY KEY,
        toan         NUMERIC(4,2),
        ngu_van      NUMERIC(4,2),
        ngoai_ngu    NUMERIC(4,2),
        vat_li       NUMERIC(4,2),
        hoa_hoc      NUMERIC(4,2),
        sinh_hoc     NUMERIC(4,2),
        lich_su      NUMERIC(4,2),
        dia_li       NUMERIC(4,2),
        gdcd         NUMERIC(4,2),
        ma_ngoai_ngu VARCHAR(4)
      )`);

    for (const [code, expr] of GROUP_TOTALS) {
      await q.query(
        `CREATE INDEX idx_students_rank_${code} ON students (${expr} DESC, sbd) WHERE ${expr} IS NOT NULL`,
      );
    }

    await q.query(`
      CREATE TABLE subject_score_stats (
        subject_code VARCHAR(16) NOT NULL,
        level        VARCHAR(16) NOT NULL,
        total        INTEGER     NOT NULL,
        PRIMARY KEY (subject_code, level)
      )`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE subject_score_stats`);
    await q.query(`DROP TABLE students`);
  }
}
