import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AcademicService {
  constructor(private prisma: PrismaService) {}

  // Academic Years
  async findAllYears() {
    return this.prisma.academicYear.findMany({
      include: { terms: { orderBy: { termNumber: 'asc' } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async findCurrentYear() {
    return this.prisma.academicYear.findFirst({
      where: { isCurrent: true },
      include: { terms: { orderBy: { termNumber: 'asc' } } },
    });
  }

  async createYear(data: { name: string; startDate: Date; endDate: Date; isCurrent?: boolean }) {
    if (data.isCurrent) {
      await this.prisma.academicYear.updateMany({ data: { isCurrent: false } });
    }
    return this.prisma.academicYear.create({ data });
  }

  async updateYear(id: string, data: Partial<{ name: string; startDate: Date; endDate: Date; isCurrent: boolean }>) {
    if (data.isCurrent) {
      await this.prisma.academicYear.updateMany({ data: { isCurrent: false } });
    }
    return this.prisma.academicYear.update({ where: { id }, data });
  }

  async setCurrentYear(id: string) {
    await this.prisma.academicYear.updateMany({ data: { isCurrent: false } });
    return this.prisma.academicYear.update({ where: { id }, data: { isCurrent: true } });
  }

  // Terms
  async findTerms(academicYearId?: string) {
    const where = academicYearId ? { academicYearId } : {};
    return this.prisma.term.findMany({
      where,
      include: { academicYear: true },
      orderBy: [{ academicYear: { startDate: 'desc' } }, { termNumber: 'asc' }],
    });
  }

  async findCurrentTerm() {
    return this.prisma.term.findFirst({
      where: { isCurrent: true },
      include: { academicYear: true },
    });
  }

  async createTerm(data: { academicYearId: string; name: string; termNumber: number; startDate: Date; endDate: Date; isCurrent?: boolean }) {
    if (data.isCurrent) {
      await this.prisma.term.updateMany({ data: { isCurrent: false } });
    }
    return this.prisma.term.create({ data, include: { academicYear: true } });
  }

  async updateTerm(id: string, data: Partial<{ name: string; termNumber: number; startDate: Date; endDate: Date; isCurrent: boolean }>) {
    if (data.isCurrent) {
      await this.prisma.term.updateMany({ data: { isCurrent: false } });
    }
    return this.prisma.term.update({ where: { id }, data, include: { academicYear: true } });
  }

  async setCurrentTerm(id: string) {
    await this.prisma.term.updateMany({ data: { isCurrent: false } });
    return this.prisma.term.update({ where: { id }, data: { isCurrent: true }, include: { academicYear: true } });
  }

  async removeYear(id: string) {
    const year = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!year) throw new NotFoundException('Mwaka wa masomo haujapatikana');
    await this.prisma.academicYear.delete({ where: { id } });
    return { message: 'Mwaka wa masomo umefutwa' };
  }

  async removeTerm(id: string) {
    const term = await this.prisma.term.findUnique({ where: { id } });
    if (!term) throw new NotFoundException('Muhula haujapatikana');
    await this.prisma.term.delete({ where: { id } });
    return { message: 'Muhula umefutwa' };
  }
}
