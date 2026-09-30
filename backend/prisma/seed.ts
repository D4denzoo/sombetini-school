import { PrismaClient } from '@prisma/client';
import { RoleName, DEFAULT_PERMISSIONS, ROLE_PERMISSIONS } from '../src/common/constants/roles';
import {
  SCHOOL_ADDRESS,
  SCHOOL_CORE_VALUE_NAMES,
  SCHOOL_MAP_EMBED_URL,
  SCHOOL_MOTTO,
  SCHOOL_PHILOSOPHY,
  HEAD_OF_SCHOOL_MESSAGE,
} from '../src/common/constants/school-identity';

const prisma = new PrismaClient();

async function main() {
  for (const perm of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  const roleData = [
    { name: RoleName.SUPER_ADMIN, displayName: 'Super Administrator' },
    { name: RoleName.SCHOOL_ADMIN, displayName: 'School Administrator' },
    { name: RoleName.ACADEMIC_ADMIN, displayName: 'Academic Administrator' },
    { name: RoleName.TEACHER, displayName: 'Teacher' },
    { name: RoleName.PARENT, displayName: 'Parent' },
    { name: RoleName.STUDENT, displayName: 'Student' },
    { name: RoleName.SYSTEM_AUDITOR, displayName: 'System Auditor' },
  ];

  for (const role of roleData) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { displayName: role.displayName },
      create: { ...role, isSystem: true },
    });
    const perms = ROLE_PERMISSIONS[role.name] || [];
    for (const permName of perms) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: created.id, permissionId: perm.id } },
        update: {},
        create: { roleId: created.id, permissionId: perm.id },
      });
    }
  }

  const identity = {
    schoolName: 'Sombetini Primary School',
    schoolNameSw: 'Shule ya Msingi Sombetini',
    motto: SCHOOL_MOTTO,
    coreValues: SCHOOL_CORE_VALUE_NAMES,
    academicPhilosophy: SCHOOL_PHILOSOPHY,
    address: SCHOOL_ADDRESS,
    mapEmbedUrl: SCHOOL_MAP_EMBED_URL,
  };

  const existing = await prisma.schoolSettings.findFirst();
  if (!existing) {
    await prisma.schoolSettings.create({
      data: {
        ...identity,
        isSetupComplete: false,
      },
    });
  } else {
    await prisma.schoolSettings.update({
      where: { id: existing.id },
      data: identity,
    });
  }

  const head = await prisma.schoolLeadership.findFirst({ where: { isHead: true } });
  if (head) {
    await prisma.schoolLeadership.update({
      where: { id: head.id },
      data: {
        welcomeMessage: HEAD_OF_SCHOOL_MESSAGE,
        position: head.position || 'Head of School',
        isActive: true,
      },
    });
  } else {
    await prisma.schoolLeadership.create({
      data: {
        name: 'Head of School',
        position: 'Head of School',
        welcomeMessage: HEAD_OF_SCHOOL_MESSAGE,
        isHead: true,
        isActive: true,
        sortOrder: 0,
      },
    });
  }

  console.log('Roles, identity, and Head of School welcome message are published.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
