import { AppDataSource } from './data-source';
import { refreshStats } from './stats';

AppDataSource.initialize()
  .then(() => refreshStats(AppDataSource.manager))
  .then(() => console.log('Stats refreshed'))
  .then(() => AppDataSource.destroy())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
