import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { RoleName } from '../common/constants/roles';

@Injectable()
export class ResultsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getStudentResults(studentId: string, user: AuthUser, termId?: string) {
    await this.verifyAccess(studentId, user);

    const cacheKey = `results:${studentId}:${termId || 'all'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const where: Record<string, unknown> = { studentId, status: 'APPROVED' };
    if (termId) where.termId = termId;

    const marks = await this.prisma.studentMark.findMany({
      where,
      include: {
        subject: true,
        examination: true,
        term: true,
        academicYear: true,
      },
      orderBy: [{ academicYear: { startDate: 'desc' } }, { term: { termNumber: 'desc' } }],
    });

    const reportCards = await this.prisma.reportCard.findMany({
      where: { studentId, isPublished: true, ...(termId ? { termId } : {}) },
      include: { term: true, academicYear: true },
      orderBy: { createdAt: 'desc' },
    });

    const result = { marks, reportCards };
    await this.redis.set(cacheKey, result, 300);
    return result;
  }

  async verifyResult(referenceNo: string) {
    const reportCard = await this.prisma.reportCard.findUnique({
      where: { referenceNo },
      include: {
        term: true,
        academicYear: true,
      },
    });

    if (!reportCard || !reportCard.isPublished) {
      throw new NotFoundException('Matokeo hayapatikani kwa nambari hii ya kumbukumbu');
    }

    return {
      verified: true,
      term: reportCard.term.name,
      academicYear: reportCard.academicYear.name,
      issuedAt: reportCard.createdAt,
    };
  }

  async enterMarks(data: {
    studentId: string;
    subjectId: string;
    examinationId: string;
    academicYearId: string;
    termId: string;
    marks: number;
    remarks?: string;
  }, user: AuthUser, ip?: string) {
    const examination = await this.prisma.examination.findUnique({ where: { id: data.examinationId } });
    if (!examination) throw new NotFoundException('Mtihani haujapatikana');

    if (data.marks < 0 || data.marks > examination.maxMarks) {
      throw new ForbiddenException(`Alama lazima iwe kati ya 0 na ${examination.maxMarks}`);
    }

    const office = user.roles.some((role) =>
      [RoleName.ACADEMIC_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.SUPER_ADMIN].includes(role as RoleName),
    );
    if (!office) {
      if (!user.teacherId) throw new ForbiddenException('Huna ruhusa ya kuingiza alama');
      const pupil = await this.prisma.student.findFirst({ where: { id: data.studentId, deletedAt: null } });
      if (!pupil) throw new NotFoundException('Mwanafunzi hajapatikana');
      const assignment = await this.prisma.teacherAssignment.findFirst({
        where: { teacherId: user.teacherId, classId: pupil.classId, subjectId: data.subjectId, isActive: true },
      });
      if (!assignment) throw new ForbiddenException('Hujawekwa kufundisha somo hili katika darasa hili');
    }

    const grade = this.calculateGrade(data.marks, examination.maxMarks);

    const existing = await this.prisma.studentMark.findUnique({
      where: {
        studentId_subjectId_examinationId: {
          studentId: data.studentId,
          subjectId: data.subjectId,
          examinationId: data.examinationId,
        },
      },
    });

    if (existing?.status === 'APPROVED') {
      throw new ForbiddenException('Matokeo yaliyoidhinishwa hayawezi kubadilishwa');
    }

    const mark = await this.prisma.studentMark.upsert({
      where: {
        studentId_subjectId_examinationId: {
          studentId: data.studentId,
          subjectId: data.subjectId,
          examinationId: data.examinationId,
        },
      },
      create: {
        ...data,
        grade,
        status: 'DRAFT',
        submittedById: user.id,
      },
      update: {
        marks: data.marks,
        grade,
        remarks: data.remarks,
        status: 'DRAFT',
      },
    });

    if (existing) {
      await this.prisma.markAuditLog.create({
        data: {
          studentMarkId: mark.id,
          userId: user.id,
          action: 'UPDATE',
          previousValue: String(existing.marks),
          newValue: String(data.marks),
          ipAddress: ip,
        },
      });
    }

    await this.redis.delPattern(`results:${data.studentId}:*`);
    return mark;
  }

  async submitMarks(examinationId: string, classId: string, user: AuthUser) {
    const result = await this.prisma.studentMark.updateMany({
      where: {
        examinationId,
        status: 'DRAFT',
        student: { classId },
        submittedById: user.id,
      },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });

    return { submitted: result.count };
  }

  async approveMarks(examinationId: string, classId: string, user: AuthUser) {
    const affected = await this.prisma.studentMark.findMany({
      where: { examinationId, status: 'SUBMITTED', student: { classId } },
      select: { studentId: true },
      distinct: ['studentId'],
    });

    const result = await this.prisma.studentMark.updateMany({
      where: {
        examinationId,
        status: 'SUBMITTED',
        student: { classId },
      },
      data: { status: 'APPROVED', approvedById: user.id, approvedAt: new Date() },
    });

    // Only the pupils whose marks changed lose their cached results; everyone else stays warm.
    await Promise.all(affected.map((row) => this.invalidateStudent(row.studentId)));
    return { approved: result.count, students: affected.length };
  }

  async invalidateStudent(studentId: string) {
    await this.redis.delPattern(`results:${studentId}:*`);
  }

  async getPendingMarks(user: AuthUser) {
    const where: Record<string, unknown> = { status: { in: ['DRAFT', 'SUBMITTED'] } };
    if (user.roles.includes(RoleName.TEACHER)) {
      where.submittedById = user.id;
    }

    return this.prisma.studentMark.findMany({
      where,
      include: {
        student: { include: { class: true } },
        subject: true,
        examination: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  async assertCanView(studentId: string, user: AuthUser) {
    return this.verifyAccess(studentId, user);
  }

  private async verifyAccess(studentId: string, user: AuthUser) {
    if (user.roles.some(r => [RoleName.SUPER_ADMIN, RoleName.SCHOOL_ADMIN, RoleName.ACADEMIC_ADMIN].includes(r as RoleName))) {
      return;
    }

    if (user.roles.includes(RoleName.TEACHER)) {
      if (!user.teacherId) throw new ForbiddenException('Huna ruhusa ya kuona matokeo haya');
      const pupil = await this.prisma.student.findFirst({
        where: { id: studentId, deletedAt: null },
        select: { classId: true },
      });
      if (!pupil) throw new NotFoundException('Mwanafunzi hajapatikana');
      const assignment = await this.prisma.teacherAssignment.findFirst({
        where: { teacherId: user.teacherId, classId: pupil.classId, isActive: true },
      });
      if (!assignment) throw new ForbiddenException('Huna ruhusa ya kuona matokeo ya mwanafunzi huyu');
      return;
    }

    if (user.roles.includes(RoleName.PARENT) && user.parentId) {
      const link = await this.prisma.parentStudent.findFirst({
        where: { parentId: user.parentId, studentId, status: 'APPROVED' },
      });
      if (!link) throw new ForbiddenException('Huna ruhusa ya kuona matokeo ya mwanafunzi huyu');
      return;
    }

    throw new ForbiddenException('Huna ruhusa ya kuona matokeo haya');
  }

  private calculateGrade(marks: number, maxMarks: number): string {
    const pct = (marks / maxMarks) * 100;
    if (pct >= 75) return 'A';
    if (pct >= 65) return 'B';
    if (pct >= 45) return 'C';
    if (pct >= 30) return 'D';
    return 'F';
  }
}
