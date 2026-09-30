#!/usr/bin/env node
/**
 * Upsert a local-only smoke admin for launch checks.
 * Does not print the password; use SMOKE_EMAIL / SMOKE_PASSWORD from env or defaults below.
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { PrismaClient } = require(join(root, 'node_modules/@prisma/client'));
const argon2 = require(join(root, 'node_modules/argon2'));

const EMAIL = process.env.SMOKE_EMAIL || 'smoke.admin@sombetini.local';
const PASSWORD = process.env.SMOKE_PASSWORD || 'SmokeLaunch1!';

const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (!role) throw new Error('SUPER_ADMIN role missing — run npm run db:seed');

  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      passwordHash,
      status: 'ACTIVE',
      emailVerified: true,
      deletedAt: null,
      lockedUntil: null,
      loginAttempts: 0,
    },
    create: {
      email: EMAIL,
      passwordHash,
      firstName: 'Smoke',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerified: true,
      roles: { create: [{ roleId: role.id }] },
    },
  });

  const hasRole = await prisma.userRole.findFirst({ where: { userId: user.id, roleId: role.id } });
  if (!hasRole) await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

  console.log(`Smoke admin ready: ${EMAIL}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
