import { ScoreRecord, Subject } from './subject';

/** An admission subject combination (tổ hợp xét tuyển), e.g. A00 = Toán + Lý + Hoá. */
export class SubjectGroup {
  constructor(
    readonly code: string,
    readonly name: string,
    readonly subjects: Subject[],
  ) {}

  /** Total score, or null when the student did not take every subject in the group. */
  total(record: ScoreRecord): number | null {
    let sum = 0;
    for (const s of this.subjects) {
      const score = s.getScore(record);
      if (score === null) return null;
      sum += score;
    }
    return Math.round(sum * 100) / 100;
  }

  /**
   * SQL expression for the group total. Must stay byte-identical to the
   * expression index created in the Init migration so Postgres can use it.
   */
  get sqlTotalExpression(): string {
    return `(${this.subjects.map((s) => s.column).join(' + ')})`;
  }

  toJSON() {
    return { code: this.code, name: this.name, subjects: this.subjects.map((s) => s.code) };
  }
}
