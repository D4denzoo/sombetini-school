#!/usr/bin/env node
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { PrismaClient } = require(join(root, 'node_modules/@prisma/client'));

const EMAIL = process.env.SMOKE_EMAIL || 'smoke.admin@sombetini.local';
const prisma = new PrismaClient();

prisma.user
  .deleteMany({ where: { email: EMAIL } })
  .then((r) => {
    console.log(`Removed smoke admin (${EMAIL}): ${r.count}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
