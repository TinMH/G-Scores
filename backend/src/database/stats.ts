import { EntityManager } from 'typeorm';
import { SCORE_LEVELS } from '../subjects/domain/score-level';
import { SubjectRegistry } from '../subjects/domain/subject-registry';

/** Rebuild subject_score_stats from students in one scan, driven by the SubjectRegistry. */
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
  });
}
