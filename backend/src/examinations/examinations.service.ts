import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExaminationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    page?: number; limit?: number; academicYearId?: string; termId?: string;
    classId?: string; type?: string; isActive?: boolean;
  } = {}) {
    const { page = 1, limit = 20, academicYearId, termId, classId, type, isActive } = filters;
    const where: Record<string, unknown> = {};
    if (academicYearId) where.academicYearId = academicYearId;
    if (termId) where.termId = termId;
    if (classId) where.classId = classId;
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.prisma.examination.findMany({
        where,
        include: { academicYear: true, term: true, class: true },
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.examination.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const exam = await this.prisma.examination.findUnique({
      where: { id },
      include: { academicYear: true, term: true, class: true },
    });
    if (!exam) throw new NotFoundException('Mtihani haujapatikana');
    return exam;
  }

  async create(data: {
    name: string; type: string; academicYearId: string; termId: string;
    classId?: string; startDate: Date; endDate: Date; maxMarks?: number; description?: string;
  }) {
    return this.prisma.examination.create({
      data,
      include: { academicYear: true, term: true, class: true },
    });
  }

  async update(id: string, data: Partial<{
    name: string; type: string; classId: string; startDate: Date; endDate: Date;
    maxMarks: number; description: string; isActive: boolean;
  }>) {
    await this.findOne(id);
    return this.prisma.examination.update({
      where: { id },
      data,
      include: { academicYear: true, term: true, class: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.examination.update({ where: { id }, data: { isActive: false } });
  }
}
