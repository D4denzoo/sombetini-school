import { ForbiddenException } from '@nestjs/common';
import { ResultsService } from './results.service';
import { RoleName } from '../common/constants/roles';

describe('ResultsService authorization', () => {
  const prisma = {
    parentStudent: { findFirst: jest.fn() },
    student: { findFirst: jest.fn() },
    teacherAssignment: { findFirst: jest.fn() },
    studentMark: { findMany: jest.fn() },
    reportCard: { findMany: jest.fn() },
  };
  const redis = { get: jest.fn(), set: jest.fn(), delPattern: jest.fn() };
  const service = new ResultsService(prisma as never, redis as never);

  const parent = {
    id: 'parent-user',
    email: 'parent@sombetini.demo',
    firstName: 'Amina',
    lastName: 'Mushi',
    roles: [RoleName.PARENT],
    permissions: [],
    parentId: 'parent-1',
  };

  beforeEach(() => jest.clearAllMocks());

  it('refuses a parent who is not linked to the requested student', async () => {
    prisma.parentStudent.findFirst.mockResolvedValue(null);

    await expect(service.getStudentResults('other-child', parent)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.studentMark.findMany).not.toHaveBeenCalled();
  });

  it('returns approved results only for a linked child', async () => {
    prisma.parentStudent.findFirst.mockResolvedValue({ parentId: 'parent-1', studentId: 'child-1' });
    prisma.studentMark.findMany.mockResolvedValue([]);
    prisma.reportCard.findMany.mockResolvedValue([]);
    redis.get.mockResolvedValue(null);

    await service.getStudentResults('child-1', parent);

    expect(prisma.parentStudent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ parentId: 'parent-1', studentId: 'child-1', status: 'APPROVED' }),
      }),
    );
    expect(prisma.studentMark.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ studentId: 'child-1', status: 'APPROVED' }),
      }),
    );
  });

  it('refuses a parent whose child claim is still pending', async () => {
    prisma.parentStudent.findFirst.mockResolvedValue(null);

    await expect(service.getStudentResults('child-1', parent)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.parentStudent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'APPROVED' }),
      }),
    );
  });

  it('refuses a teacher who is not assigned to the pupil’s class', async () => {
    const teacher = {
      id: 'teacher-user',
      email: 'teacher@sombetini.demo',
      firstName: 'John',
      lastName: 'Mwangi',
      roles: [RoleName.TEACHER],
      permissions: [],
      teacherId: 'teacher-1',
    };
    prisma.student.findFirst.mockResolvedValue({ classId: 'class-9' });
    prisma.teacherAssignment.findFirst.mockResolvedValue(null);

    await expect(service.getStudentResults('child-1', teacher)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.studentMark.findMany).not.toHaveBeenCalled();
  });
});
