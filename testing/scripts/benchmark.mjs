// Latency benchmark: runs the benchmark collection through newman's API and prints avg / p50 / p95 / max per endpoint.
//
//   npm run bench                                   (http://localhost:3000/api, 200 iterations after 10 warm-up)
//   BASE_URL=https://host/api BENCH_ITERATIONS=500 npm run bench
//
// Writes reports/benchmark.json and reports/benchmark.md (a table ready to paste into a README).
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import os from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import newman from 'newman';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000/api';
const WARMUP = Number(process.env.BENCH_WARMUP ?? 10); // first iterations are dropped (JIT, connection setup, cold caches)
const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? 200);
const DATASET = process.env.DATASET_PATH ?? resolve(root, '../dataset/diem_thi_thpt_2024.csv');

// What each benchmark request is, for the markdown table.
const ENDPOINTS = {
  health: ['GET', '/api/health', 'API and database health check'],
  lookup: ['GET', '/api/students/:sbd', 'Look up a score sheet by 8-digit candidate number (primary-key lookup)'],
  levels: ['GET', '/api/reports/score-levels', 'Score distribution in 4 levels for all 9 subjects (pre-aggregated at seed time)'],
  ranking: ['GET', '/api/rankings/:group?limit=10', 'Top 10 candidates of a group, here A00 (expression index)'],
  overview: ['GET', '/api/overview', 'Totals, top scorers and per-subject stats (pre-aggregated at seed time)'],
  subjects: ['GET', '/api/subjects', 'Subject and group catalog'],
};

/** Candidate numbers spread across the whole dataset, so lookups hit different parts of the index. */
async function sampleSbds(count) {
  if (!existsSync(DATASET)) return [{ sbd: '01000001' }];
  const sbds = [];
  const rl = createInterface({ input: createReadStream(DATASET) });
  let first = true;
  for await (const line of rl) {
    if (first) { first = false; continue; } // header
    sbds.push(line.slice(0, 8));
  }
  const step = Math.max(1, Math.floor(sbds.length / count));
  return Array.from({ length: count }, (_, i) => ({ sbd: sbds[(i * step) % sbds.length] }));
}

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const round = (n) => Math.round(n * 10) / 10;

const total = WARMUP + ITERATIONS;
const iterationData = await sampleSbds(total);
const samples = new Map(); // endpoint -> response times (ms) after warm-up
const errors = [];

console.log(`Benchmarking ${BASE_URL}: ${WARMUP} warm-up + ${ITERATIONS} measured iterations x ${Object.keys(ENDPOINTS).length} endpoints`);

const summary = await new Promise((done, fail) => {
  newman
    .run({
      collection: resolve(root, 'collections/gscores.benchmark.postman_collection.json'),
      envVar: [{ key: 'baseUrl', value: BASE_URL }],
      iterationData,
      iterationCount: total,
      reporters: [],
      timeoutRequest: 10_000,
    })
    .on('request', (err, args) => {
      if (err) return errors.push(`${args.item.name}: ${err.message}`);
      if (args.cursor.iteration < WARMUP) return;
      if (args.response.code !== 200) errors.push(`${args.item.name}: HTTP ${args.response.code}`);
      const list = samples.get(args.item.name) ?? [];
      list.push(args.response.responseTime);
      samples.set(args.item.name, list);
    })
    .on('done', (err, s) => (err ? fail(err) : done(s)));
});

const rows = Object.entries(ENDPOINTS).map(([name, [method, endpoint, description]]) => {
  const times = (samples.get(name) ?? []).sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / (times.length || 1);
  return {
    name, method, endpoint, description,
    samples: times.length,
    avg: round(avg), min: round(times[0] ?? 0), p50: round(quantile(times, 0.5) ?? 0),
    p95: round(quantile(times, 0.95) ?? 0), max: round(times.at(-1) ?? 0),
  };
});

const env = {
  date: new Date().toISOString().slice(0, 10),
  baseUrl: BASE_URL,
  node: process.version,
  os: `${os.platform()} ${os.release()}`,
  cpu: `${os.cpus()[0].model.trim()} (${os.cpus().length} threads)`,
  memoryGB: Math.round(os.totalmem() / 2 ** 30),
  warmup: WARMUP, iterations: ITERATIONS,
};

// Console table
const pad = (s, n) => String(s).padEnd(n);
console.log('\n' + pad('endpoint', 34) + pad('avg', 9) + pad('p50', 9) + pad('p95', 9) + pad('max', 9) + 'samples');
for (const r of rows) console.log(pad(`${r.method} ${r.endpoint}`, 34) + pad(`${r.avg} ms`, 9) + pad(`${r.p50} ms`, 9) + pad(`${r.p95} ms`, 9) + pad(`${r.max} ms`, 9) + r.samples);
if (errors.length) console.log(`\n${errors.length} problem(s), e.g. ${errors.slice(0, 3).join('; ')}`);

// Markdown for the README
const md = [
  '| Method | Endpoint | Description | avg | p95 |',
  '|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.method} | \`${r.endpoint}\` | ${r.description} | **${r.avg} ms** | ${r.p95} ms |`),
  '',
  `<sub>Measured with newman (\`npm run bench\`): ${env.iterations} iterations after ${env.warmup} warm-up, ${env.date}, ` +
    `${env.cpu}, ${env.memoryGB} GB RAM, Node ${env.node}, Postgres 16 in Docker, 1,061,605 candidates. Numbers depend on the machine.</sub>`,
  '',
].join('\n');

mkdirSync(resolve(root, 'reports'), { recursive: true });
writeFileSync(resolve(root, 'reports/benchmark.json'), JSON.stringify({ env, rows }, null, 2));
writeFileSync(resolve(root, 'reports/benchmark.md'), md);
console.log('\nWrote reports/benchmark.json and reports/benchmark.md');

// Fail the run if any request was not a clean 200, so a broken API can't produce "fast" numbers.
process.exit(errors.length || summary.run.failures.length ? 1 : 0);
