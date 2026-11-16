import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Pre-aggregated counts per subject × level, rebuilt after seeding. */
@Entity('subject_score_stats')
export class SubjectScoreStat {
  @PrimaryColumn({ type: 'varchar', length: 16 })
  subject_code: string;

  @PrimaryColumn({ type: 'varchar', length: 16 })
  level: string;

  @Column({ type: 'integer' })
  total: number;
}
