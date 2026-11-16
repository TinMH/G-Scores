import { Column, Entity, PrimaryColumn, ValueTransformer } from 'typeorm';

/** pg returns NUMERIC as string; convert to number for the app. */
const numeric: ValueTransformer = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null ? null : Number(v)),
};

const score = { type: 'numeric', precision: 4, scale: 2, nullable: true, transformer: numeric } as const;

@Entity('students')
export class Student {
  @PrimaryColumn({ type: 'char', length: 8 })
  sbd: string;

  @Column(score) toan: number | null;
  @Column(score) ngu_van: number | null;
  @Column(score) ngoai_ngu: number | null;
  @Column(score) vat_li: number | null;
  @Column(score) hoa_hoc: number | null;
  @Column(score) sinh_hoc: number | null;
  @Column(score) lich_su: number | null;
  @Column(score) dia_li: number | null;
  @Column(score) gdcd: number | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  ma_ngoai_ngu: string | null;
}
