import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubjectRegistry } from '../subjects/domain/subject-registry';
import { Student } from './student.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student) private readonly repo: Repository<Student>,
    private readonly registry: SubjectRegistry,
  ) {}

  async findBySbd(sbd: string) {
    const student = await this.repo.findOneBy({ sbd });
    if (!student) throw new NotFoundException(`Không tìm thấy thí sinh có số báo danh ${sbd}`);

    return {
      sbd: student.sbd,
      foreignLanguage: this.registry.foreignLanguage.getLanguageName(student),
      scores: this.registry.allSubjects().map((subject) => {
        const score = subject.getScore(student);
        return {
          subject: subject.toJSON(),
          score,
          level: score === null ? null : subject.classify(score),
        };
      }),
      groups: this.registry
        .allGroups()
        .map((g) => ({ ...g.toJSON(), total: g.total(student) }))
        .filter((g) => g.total !== null),
    };
  }
}
