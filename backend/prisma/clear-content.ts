import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

function loadEnv() {
  const text = readFileSync(resolve(__dirname, '../.env'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

loadEnv();
const prisma = new PrismaClient();

async function main() {
  await prisma.markAuditLog.deleteMany();
  await prisma.studentMark.deleteMany();
  await prisma.resultApproval.deleteMany();
  await prisma.reportCard.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feeItem.deleteMany();
  await prisma.parentStudent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacherAssignment.deleteMany();
  await prisma.announcementAttachment.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.document.deleteMany();
  await prisma.learningResource.deleteMany();
  await prisma.galleryImage.deleteMany();
  await prisma.galleryAlbum.deleteMany();
  await prisma.aiMessage.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.aiFaq.deleteMany();
  await prisma.schoolLeadership.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.examination.deleteMany();
  await prisma.otpToken.deleteMany();
  await prisma.auditLog.deleteMany();

  const admins = await prisma.user.findMany({
    where: { roles: { some: { role: { name: 'SUPER_ADMIN' } } } },
    select: { id: true },
  });
  const keep = admins.map((admin) => admin.id);

  await prisma.teacher.deleteMany();
  await prisma.parent.deleteMany();
  if (keep.length) {
    await prisma.user.deleteMany({ where: { id: { notIn: keep } } });
  }

  await prisma.term.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();

  await prisma.schoolSettings.updateMany({
    data: {
      motto: null,
      vision: null,
      mission: null,
      coreValues: null,
      history: null,
      academicPhilosophy: null,
      achievements: null,
    },
  });

  console.log(`School records cleared. Administrator accounts kept: ${keep.length}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
