import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(isActive?: boolean) {
    const where = isActive !== undefined ? { isActive } : {};
    return this.prisma.subject.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      select: { id: true, name: true, code: true, description: true, maxMarks: true, isActive: true },
    });
    if (!subject) throw new NotFoundException('Somo halipatikani');
    return subject;
  }

  async create(data: { name: string; code: string; description?: string; maxMarks?: number }) {
    return this.prisma.subject.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; code: string; description: string; maxMarks: number; isActive: boolean }>) {
    await this.findOne(id);
    return this.prisma.subject.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.subject.update({ where: { id }, data: { isActive: false } });
  }
}
