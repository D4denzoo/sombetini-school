import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll(isActive?: boolean) {
    const where = isActive !== undefined ? { isActive } : {};
    return this.prisma.class.findMany({
      where,
      include: { _count: { select: { students: true } } },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      select: {
        id: true, name: true, level: true, section: true, capacity: true, description: true, isActive: true,
      },
    });
    if (!cls) throw new NotFoundException('Darasa halipatikani');
    return cls;
  }

  async create(data: { name: string; level: number; section?: string; capacity?: number; description?: string }) {
    return this.prisma.class.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; level: number; section: string; capacity: number; description: string; isActive: boolean }>) {
    await this.findOne(id);
    return this.prisma.class.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.class.update({ where: { id }, data: { isActive: false } });
  }
}
