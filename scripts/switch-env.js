#!/usr/bin/env node
import { copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const env = process.argv[2];

if (!['development', 'staging', 'production'].includes(env)) {
  console.error('❌ Invalid environment. Use: development, staging, or production');
  process.exit(1);
}

const sourceFile = join(rootDir, `.env.${env}`);
const targetFile = join(rootDir, '.env');

try {
  copyFileSync(sourceFile, targetFile);
  console.log(`✅ Switched to ${env.toUpperCase()} environment`);
  console.log(`📝 Active config: .env.${env} → .env`);
} catch (error) {
  console.error(`❌ Failed to switch environment:`, error.message);
  process.exit(1);
}
