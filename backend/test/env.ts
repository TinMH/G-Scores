import 'dotenv/config';

// e2e tests always run against a dedicated database, never the dev one.
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'gscores_test';
