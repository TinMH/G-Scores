import {
  CoreSubject,
  ForeignLanguageSubject,
  NaturalScienceSubject,
  SocialScienceSubject,
  Subject,
} from './subject';
import { SubjectGroup } from './subject-group';

/** Single source of truth for subjects and groups. Everything else reads from here. */
export class SubjectRegistry {
  readonly math = new CoreSubject('toan', 'Toán');
  readonly literature = new CoreSubject('ngu_van', 'Ngữ văn');
  readonly foreignLanguage = new ForeignLanguageSubject('ngoai_ngu', 'Ngoại ngữ');
  readonly physics = new NaturalScienceSubject('vat_li', 'Vật lí');
  readonly chemistry = new NaturalScienceSubject('hoa_hoc', 'Hoá học');
  readonly biology = new NaturalScienceSubject('sinh_hoc', 'Sinh học');
  readonly history = new SocialScienceSubject('lich_su', 'Lịch sử');
  readonly geography = new SocialScienceSubject('dia_li', 'Địa lí');
  readonly civics = new SocialScienceSubject('gdcd', 'GDCD');

  private readonly subjects: Subject[] = [
    this.math,
    this.literature,
    this.foreignLanguage,
    this.physics,
    this.chemistry,
    this.biology,
    this.history,
    this.geography,
    this.civics,
  ];

  private readonly groups: SubjectGroup[] = [
    new SubjectGroup('A00', 'Khối A', [this.math, this.physics, this.chemistry]),
    new SubjectGroup('A01', 'Khối A1', [this.math, this.physics, this.foreignLanguage]),
    new SubjectGroup('B00', 'Khối B', [this.math, this.chemistry, this.biology]),
    new SubjectGroup('C00', 'Khối C', [this.literature, this.history, this.geography]),
    new SubjectGroup('D01', 'Khối D', [this.math, this.literature, this.foreignLanguage]),
  ];

  allSubjects(): readonly Subject[] {
    return this.subjects;
  }

  allGroups(): readonly SubjectGroup[] {
    return this.groups;
  }

  findSubject(code: string): Subject | undefined {
    return this.subjects.find((s) => s.code === code);
  }

  findGroup(code: string): SubjectGroup | undefined {
    return this.groups.find((g) => g.code === code.toUpperCase());
  }
}
