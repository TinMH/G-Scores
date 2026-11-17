import { EntityManager } from 'typeorm';
import { SCORE_LEVELS } from '../subjects/domain/score-level';
import { SubjectRegistry } from '../subjects/domain/subject-registry';

export interface SubjectOverviewRow {
  code: string;
  taken: number;
  average: number | null;
  perfect: number;
}

export interface TopScorerRow {
  group: string;
  sbd: string;
  total: number;
}

/**
 * Rebuild the pre-aggregated tables from `students`, driven by the SubjectRegistry:
 *  - subject_score_stats: counts per subject x score level (Reports)
 *  - overview_stats:      totals, per-subject averages / perfect scores, top scorer per group (Dashboard)
 */
export async function refreshStats(manager: EntityManager, registry = new SubjectRegistry()) {
  const levelCase = (col: string) =>
    `CASE ${SCORE_LEVELS.filter((l) => l.min !== -Infinity)
      .map((l) => `WHEN ${col} >= ${l.min} THEN '${l.level}'`)
      .join(' ')} ELSE '${SCORE_LEVELS.at(-1)!.level}' END`;

  // One unpivot via LATERAL VALUES -> a single pass over the table.
  const values = registry
    .allSubjects()
    .map((s) => `('${s.code}', ${s.column})`)
    .join(', ');

  await manager.transaction(async (tx) => {
    await tx.query(`DELETE FROM subject_score_stats`);
    await tx.query(`
      INSERT INTO subject_score_stats (subject_code, level, total)
      SELECT v.code, ${levelCase('v.score')}, COUNT(*)
      FROM students, LATERAL (VALUES ${values}) AS v(code, score)
      WHERE v.score IS NOT NULL
      GROUP BY 1, 2`);

    const [{ candidates }] = await tx.query(`SELECT COUNT(*)::int AS candidates FROM students`);

    const subjectRows: { code: string; taken: number; average: string | null; perfect: number }[] = await tx.query(`
      SELECT v.code,
             COUNT(v.score)::int                      AS taken,
             ROUND(AVG(v.score), 2)                   AS average,
             (COUNT(*) FILTER (WHERE v.score = 10))::int AS perfect
      FROM students, LATERAL (VALUES ${values}) AS v(code, score)
      GROUP BY v.code`);
    const byCode = new Map(subjectRows.map((r) => [r.code, r]));
    const subjects: SubjectOverviewRow[] = registry.allSubjects().map((s) => {
      const r = byCode.get(s.code);
      return {
        code: s.code,
        taken: r?.taken ?? 0,
        average: r?.average == null ? null : Number(r.average),
        perfect: r?.perfect ?? 0,
      };
    });

    // Uses the per-group ranking expression indexes, so each lookup is instant.
    const topScorers: TopScorerRow[] = [];
    for (const group of registry.allGroups()) {
      const expr = group.sqlTotalExpression;
      const [row] = await tx.query(
        `SELECT sbd, ${expr} AS total FROM students WHERE ${expr} IS NOT NULL ORDER BY ${expr} DESC, sbd LIMIT 1`,
      );
      if (row) topScorers.push({ group: group.code, sbd: row.sbd, total: Number(row.total) });
    }

    const totals = {
      candidates,
      papers: subjects.reduce((sum, s) => sum + s.taken, 0),
      perfectScores: subjects.reduce((sum, s) => sum + s.perfect, 0),
    };

    const upsert = (key: string, value: unknown) =>
      tx.query(
        `INSERT INTO overview_stats (key, value) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, JSON.stringify(value)],
      );
    await upsert('totals', totals);
    await upsert('subjects', subjects);
    await upsert('group_top_scorers', topScorers);
  });
}
