import { AppDataSource } from './data-source';

async function main() {
  await AppDataSource.initialize();
  const applied = await AppDataSource.runMigrations({ transaction: 'each' });
  console.log(applied.length ? `Applied: ${applied.map((m) => m.name).join(', ')}` : 'No pending migrations');
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
