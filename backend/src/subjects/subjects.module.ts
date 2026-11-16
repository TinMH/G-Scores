import { Controller, Get, Global, Module } from '@nestjs/common';
import { SubjectRegistry } from './domain/subject-registry';

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly registry: SubjectRegistry) {}

  @Get()
  list() {
    return { subjects: this.registry.allSubjects(), groups: this.registry.allGroups() };
  }
}

@Global()
@Module({
  controllers: [SubjectsController],
  providers: [SubjectRegistry],
  exports: [SubjectRegistry],
})
export class SubjectsModule {}
