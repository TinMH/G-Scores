import { classifyScore, ScoreLevel } from './score-level';

/** Score columns on the `students` table. */
export type ScoreColumn =
  | 'toan'
  | 'ngu_van'
  | 'ngoai_ngu'
  | 'vat_li'
  | 'hoa_hoc'
  | 'sinh_hoc'
  | 'lich_su'
  | 'dia_li'
  | 'gdcd';

export type ScoreRecord = Partial<Record<ScoreColumn, number | null>> & {
  ma_ngoai_ngu?: string | null;
};

export enum SubjectCategory {
  CORE = 'core', // compulsory: Toán, Văn, Ngoại ngữ
  NATURAL_SCIENCE = 'natural_science', // KHTN: Lý, Hoá, Sinh
  SOCIAL_SCIENCE = 'social_science', // KHXH: Sử, Địa, GDCD
}

export abstract class Subject {
  abstract readonly category: SubjectCategory;

  constructor(
    readonly code: ScoreColumn,
    readonly name: string,
  ) {}

  /** DB column holding this subject's score (also the public code). */
  get column(): ScoreColumn {
    return this.code;
  }

  getScore(record: ScoreRecord): number | null {
    const raw = record[this.column];
    return raw === null || raw === undefined ? null : Number(raw);
  }

  classify(score: number): ScoreLevel {
    return classifyScore(score);
  }

  toJSON() {
    return { code: this.code, name: this.name, category: this.category };
  }
}

export class CoreSubject extends Subject {
  readonly category = SubjectCategory.CORE;
}

export class NaturalScienceSubject extends Subject {
  readonly category = SubjectCategory.NATURAL_SCIENCE;
}

export class SocialScienceSubject extends Subject {
  readonly category = SubjectCategory.SOCIAL_SCIENCE;
}

/** Foreign language carries an extra language code (N1 = English, N2 = Russian, ...). */
export class ForeignLanguageSubject extends CoreSubject {
  private static readonly LANGUAGES: Record<string, string> = {
    N1: 'Tiếng Anh',
    N2: 'Tiếng Nga',
    N3: 'Tiếng Pháp',
    N4: 'Tiếng Trung',
    N5: 'Tiếng Đức',
    N6: 'Tiếng Nhật',
    N7: 'Tiếng Hàn',
  };

  getLanguageName(record: ScoreRecord): string | null {
    const code = record.ma_ngoai_ngu;
    return code ? (ForeignLanguageSubject.LANGUAGES[code] ?? code) : null;
  }
}
