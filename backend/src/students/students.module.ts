import { Controller, Get, Module, Param } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SbdParamDto } from './dto/sbd-param.dto';
import { Student } from './student.entity';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Get(':sbd')
  findOne(@Param() { sbd }: SbdParamDto) {
    return this.service.findBySbd(sbd);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Student])],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
