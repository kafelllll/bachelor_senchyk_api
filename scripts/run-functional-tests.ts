import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const port = Number(process.env.FUNCTIONAL_TEST_PORT || 3101);
const baseUrl = `http://127.0.0.1:${port}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForHealth = async (timeoutMs = 30000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {
    }
    await sleep(500);
  }
  throw new Error('Functional test server did not become healthy in time');
};

const projectRoot = process.cwd();
const reportsDir = path.join(projectRoot, 'reports');
await mkdir(reportsDir, { recursive: true });

const server = spawn(process.execPath, ['--import', 'tsx', 'scripts/functional-test-server.ts'], {
  cwd: projectRoot,
  env: {
    ...process.env,
    FUNCTIONAL_TEST_PORT: String(port),
  },
  stdio: 'inherit',
});

try {
  await waitForHealth(30000);

  const newmanArgs = [
    'run',
    'postman/plantmatch-functional.postman_collection.json',
    '-e',
    'postman/plantmatch-local.postman_environment.json',
    '--env-var',
    `baseUrl=${baseUrl}`,
    '--reporters',
    'cli,junit',
    '--reporter-junit-export',
    'reports/newman-functional.xml',
    '--bail',
  ];

  await new Promise((resolve, reject) => {
    const runner = spawn(
      process.execPath,
      ['node_modules/newman/bin/newman.js', ...newmanArgs],
      { cwd: projectRoot, stdio: 'inherit' },
    );

    runner.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Newman failed with exit code ${code ?? 'null'}`));
    });

    runner.on('error', reject);
  });
} finally {
  server.kill('SIGTERM');
}
