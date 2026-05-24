import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');
const envTestPath = path.join(rootDir, '.env.test');
const envRuntimePath = path.join(rootDir, '.env.test.runtime');

dotenv.config({ path: envRuntimePath, override: true, quiet: true });
dotenv.config({ path: envTestPath, override: false, quiet: true });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_change_me';
process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || '';
process.env.SMTP_HOST = process.env.SMTP_HOST || 'smtp.test.local';
process.env.SMTP_PORT = process.env.SMTP_PORT || '587';
process.env.SMTP_USER = process.env.SMTP_USER || 'test-user';
process.env.SMTP_PASS = process.env.SMTP_PASS || 'test-pass';
process.env.SMTP_FROM = process.env.SMTP_FROM || 'noreply@test.local';
