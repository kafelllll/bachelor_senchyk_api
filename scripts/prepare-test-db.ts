import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import pg from 'pg';

const { Client } = pg;

const cwd = process.cwd();
const envTestPath = path.join(cwd, '.env.test');
const envPath = path.join(cwd, '.env');
const envRuntimePath = path.join(cwd, '.env.test.runtime');

if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: true, quiet: true });
}

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: false, quiet: true });
}

const parseEnvDatabaseUrl = (filePath) => {
  if (!fs.existsSync(filePath)) return '';
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = dotenv.parse(raw);
  return parsed.DATABASE_URL || '';
};

const stripQuotes = (value = '') => value.replace(/^['"]|['"]$/g, '');

const parseUrl = (urlString) => {
  try {
    return new URL(urlString);
  } catch {
    return null;
  }
};

const safeDbNameFromUrl = (urlString, fallback) => {
  const parsed = parseUrl(urlString);
  if (!parsed) return fallback;
  const name = parsed.pathname.replace(/^\//, '');
  return name || fallback;
};

const buildUrlWithDbName = (baseUrl, dbName) => {
  const parsed = parseUrl(baseUrl);
  if (!parsed) return '';
  parsed.pathname = `/${dbName}`;
  return parsed.toString();
};

const redactUrl = (urlString) => {
  const parsed = parseUrl(urlString);
  if (!parsed) return '<invalid-url>';
  if (parsed.password) parsed.password = '***';
  return parsed.toString();
};

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

const ensureDatabaseExists = async (candidateUrl) => {
  const parsed = parseUrl(candidateUrl);
  if (!parsed) {
    throw new Error('Invalid DATABASE_URL format');
  }

  const targetDb = parsed.pathname.replace(/^\//, '');
  if (!targetDb) {
    throw new Error('DATABASE_URL must include a database name');
  }

  const adminUrl = new URL(candidateUrl);
  adminUrl.pathname = '/postgres';

  const adminClient = new Client({ connectionString: adminUrl.toString() });
  await adminClient.connect();

  try {
    const exists = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDb],
    );

    if (exists.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE ${quoteIdent(targetDb)}`);
      console.log(`Created test database: ${targetDb}`);
    }
  } finally {
    await adminClient.end();
  }

  const testClient = new Client({ connectionString: candidateUrl });
  await testClient.connect();
  await testClient.end();
};

const runPrismaDbPush = (databaseUrl) => {
  const prismaCliPath = path.join(cwd, 'node_modules', 'prisma', 'build', 'index.js');
  const result = spawnSync(process.execPath, [prismaCliPath, 'db', 'push', '--url', databaseUrl], {
    cwd,
    env: { ...process.env },
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error('Failed to run prisma db push for test database');
  }
};

const main = async () => {
  const rawTestUrl = stripQuotes(parseEnvDatabaseUrl(envTestPath) || process.env.DATABASE_URL || '');
  const rawAppUrl = stripQuotes(parseEnvDatabaseUrl(envPath));

  if (!rawTestUrl) {
    throw new Error('DATABASE_URL is missing. Configure .env.test before running integration tests.');
  }

  const targetDbName = safeDbNameFromUrl(rawTestUrl, 'plantmatch_test');
  const candidates = [];
  const seen = new Set();

  const pushCandidate = (url) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    candidates.push(url);
  };

  pushCandidate(rawTestUrl);

  if (rawAppUrl) {
    const rebuiltFromAppCreds = buildUrlWithDbName(rawAppUrl, targetDbName);
    pushCandidate(rebuiltFromAppCreds);
  }

  let lastError = null;

  for (const candidate of candidates) {
    try {
      await ensureDatabaseExists(candidate);
      process.env.DATABASE_URL = candidate;
      fs.writeFileSync(envRuntimePath, `DATABASE_URL=${candidate}\n`, 'utf8');
      runPrismaDbPush(candidate);
      console.log(`Test DB is ready: ${redactUrl(candidate)}`);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Unable to prepare test database. Last error: ${lastError?.message || 'unknown error'}`,
  );
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
