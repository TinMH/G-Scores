import 'dotenv/config';
import { DataSourceOptions } from 'typeorm';
import { SubjectScoreStat } from '../reports/subject-score-stat.entity';
import { Student } from '../students/student.entity';
import { Init1731740000000 } from '../database/migrations/1731740000000-Init';

export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'gscores',
  password: process.env.DB_PASSWORD ?? 'gscores',
  database: process.env.DB_NAME ?? 'gscores',
  entities: [Student, SubjectScoreStat],
  migrations: [Init1731740000000],
  synchronize: false,
};
