import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { randomBytes } from 'crypto';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { ResultsService } from './results.service';
import { StorageService } from '../storage/storage.service';
import { MessagingService } from '../messaging/messaging.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { DOCUMENTS_QUEUE, DocumentsJob, ReportCardPdfJobData } from '../queue/queue.constants';

@Injectable()
export class ReportCardService {
  private readonly logger = new Logger(ReportCardService.name);

  constructor(
    private prisma: PrismaService,
    private results: ResultsService,
    private storage: StorageService,
    private messaging: MessagingService,
    @InjectQueue(DOCUMENTS_QUEUE) private documents: Queue,
  ) {}

  /**
   * Builds (or refreshes) report cards for every pupil in a class for one term from APPROVED marks,
   * ranks them, publishes, queues the PDFs, and tells the linked parents. Idempotent: re-running
   * recomputes averages and positions for the same term without duplicating cards.
   */
  async publish(termId: string, classId: string, user: AuthUser, comments?: { headComment?: string }) {
    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) throw new NotFoundException('Term not found');
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('Class not found');

    const pupils = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });
    if (pupils.length === 0) throw new BadRequestException('This class has no active pupils');

    const marks = await this.prisma.studentMark.findMany({
      where: { termId, status: 'APPROVED', studentId: { in: pupils.map((p) => p.id) }, marks: { not: null } },
      select: { studentId: true, marks: true, examination: { select: { maxMarks: true } } },
    });
    if (marks.length === 0) {
      throw new BadRequestException('No approved marks for this class and term yet. Approve marks first.');
    }

    const totals = new Map<string, { sum: number; count: number }>();
    for (const mark of marks) {
      const pct = (Number(mark.marks) / Math.max(1, mark.examination.maxMarks)) * 100;
      const entry = totals.get(mark.studentId) || { sum: 0, count: 0 };
      entry.sum += pct;
      entry.count += 1;
      totals.set(mark.studentId, entry);
    }

    const ranked = Array.from(totals.entries())
      .map(([studentId, entry]) => ({ studentId, average: Math.round((entry.sum / entry.count) * 10) / 10 }))
      .sort((a, b) => b.average - a.average);

    const year = await this.prisma.academicYear.findUnique({
      where: { id: term.academicYearId },
      select: { name: true },
    });
    const yearCode = (year?.name || 'YEAR').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'YEAR';
    const published: string[] = [];

    // Competition ranking: equal averages share a position (1, 2, 2, 4).
    let position = 0;
    for (let index = 0; index < ranked.length; index += 1) {
      const row = ranked[index];
      if (index === 0 || ranked[index - 1].average !== row.average) {
        position = index + 1;
      }

      const card = await this.prisma.reportCard.upsert({
        where: { studentId_academicYearId_termId: { studentId: row.studentId, academicYearId: term.academicYearId, termId } },
        create: {
          studentId: row.studentId,
          academicYearId: term.academicYearId,
          termId,
          averageScore: row.average,
          position,
          totalStudents: ranked.length,
          headComment: comments?.headComment,
          referenceNo: `SPS-${yearCode}-T${term.termNumber}-${randomBytes(3).toString('hex').toUpperCase()}`,
          isPublished: true,
          publishedAt: new Date(),
        },
        update: {
          averageScore: row.average,
          position,
          totalStudents: ranked.length,
          ...(comments?.headComment ? { headComment: comments.headComment } : {}),
          isPublished: true,
          publishedAt: new Date(),
          pdfUrl: null,
        },
        select: { id: true, studentId: true },
      });

      published.push(card.id);
      await this.enqueue(card.id);
      await this.results.invalidateStudent(card.studentId);
    }

    const parents = await this.prisma.parentStudent.findMany({
      where: { studentId: { in: ranked.map((r) => r.studentId) }, status: 'APPROVED' },
      select: { parent: { select: { userId: true } } },
    });
    const parentUserIds = Array.from(new Set(parents.map((link) => link.parent.userId)));
    if (parentUserIds.length > 0) {
      await this.messaging.notifyUsers(parentUserIds, {
        type: 'RESULTS_AVAILABLE',
        title: `Matokeo ya ${term.name} yametoka`,
        message: `Report cards for ${klass.name}, ${term.name} are now available in the Parent Portal.`,
        data: { termId, classId },
      });
    }

    this.logger.log(`published report cards term=${termId} class=${classId} count=${published.length} by=${user.id}`);
    return { published: published.length, parentsNotified: parentUserIds.length, pdfQueued: published.length };
  }

  /**
   * Serves the stored PDF when the report card was published (generated once, in the background).
   * Falls back to rendering on demand so a parent is never told "not ready" for a published card.
   */
  async generate(studentId: string, user: AuthUser, termId?: string): Promise<Buffer> {
    await this.results.assertCanView(studentId, user);

    const report = await this.prisma.reportCard.findFirst({
      where: { studentId, isPublished: true, ...(termId ? { termId } : {}) },
      orderBy: { publishedAt: 'desc' },
    });
    if (!report) {
      throw new NotFoundException('No published report card is available for this pupil yet.');
    }

    if (report.pdfUrl) {
      const stored = await this.storage.readPrivate(report.pdfUrl);
      if (stored) return stored;
    }

    const buffer = await this.render(studentId, termId || report.termId);
    await this.persist(report.id, buffer);
    return buffer;
  }

  /** Queue a background render for a report card (called on publish). */
  async enqueue(reportCardId: string) {
    // Version the job id so a failed earlier render cannot block a fresh publish forever.
    await this.documents.add(
      DocumentsJob.REPORT_CARD_PDF,
      { reportCardId } satisfies ReportCardPdfJobData,
      {
        jobId: `report-card:${reportCardId}:${Date.now()}`,
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  /** Worker entry: render and store one report card. */
  async renderAndStore(reportCardId: string) {
    const report = await this.prisma.reportCard.findUnique({ where: { id: reportCardId } });
    if (!report) throw new NotFoundException('Report card not found');
    const buffer = await this.render(report.studentId, report.termId);
    await this.persist(reportCardId, buffer);
    return { reportCardId, bytes: buffer.length };
  }

  private async persist(reportCardId: string, buffer: Buffer) {
    const relative = `report-cards/${reportCardId}.pdf`;
    await this.storage.writePrivate(relative, buffer);
    await this.prisma.reportCard.update({ where: { id: reportCardId }, data: { pdfUrl: relative } });
  }

  private async render(studentId: string, termId?: string): Promise<Buffer> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });
    if (!student) throw new NotFoundException('Mwanafunzi hajapatikana');

    const settings = await this.prisma.schoolSettings.findFirst();
    const report = await this.prisma.reportCard.findFirst({
      where: { studentId, isPublished: true, ...(termId ? { termId } : {}) },
      include: { term: true, academicYear: true },
      orderBy: { publishedAt: 'desc' },
    });

    const marks = await this.prisma.studentMark.findMany({
      where: {
        studentId,
        status: 'APPROVED',
        ...(termId || report?.termId ? { termId: termId || report?.termId } : {}),
      },
      include: { subject: true },
      orderBy: { subject: { name: 'asc' } },
    });

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const green = '#1B4D3E';
    const gold = '#C4A35A';

    doc.rect(0, 0, doc.page.width, 92).fill(green);
    doc.fillColor('#F4EFE4').fontSize(18).text(settings?.schoolName || 'Sombetini Primary School', 48, 28);
    doc.fontSize(10).fillColor(gold).text(settings?.motto || '', 48, 52);
    doc.fillColor('#F4EFE4').fontSize(9).text(
      [settings?.address, settings?.phone, settings?.email].filter(Boolean).join('  ·  '),
      48,
      70,
    );

    doc.fillColor(green).fontSize(16).text('RIPOTI YA MAENDELEO / REPORT CARD', 48, 112);
    doc.moveTo(48, 136).lineTo(547, 136).strokeColor(gold).lineWidth(2).stroke();

    const year = report?.academicYear?.name || '—';
    const term = report?.term?.name || '—';
    doc.fillColor('#17241E').fontSize(11);
    doc.text(`Mwaka wa masomo: ${year}`, 48, 152);
    doc.text(`Muhula: ${term}`, 320, 152);
    doc.text(`Jina: ${student.firstName} ${student.lastName}`, 48, 172);
    doc.text(`Nambari ya usajili: ${student.registrationNo}`, 320, 172);
    doc.text(`Darasa: ${student.class.name}`, 48, 192);
    doc.text(`Kumbukumbu: ${report?.referenceNo || '—'}`, 320, 192);

    let y = 230;
    doc.rect(48, y, 499, 22).fill(green);
    doc.fillColor('#F4EFE4').fontSize(10);
    doc.text('Somo', 56, y + 6);
    doc.text('Alama', 280, y + 6);
    doc.text('Daraja', 380, y + 6);
    doc.text('Maoni', 450, y + 6);
    y += 22;

    doc.fillColor('#17241E');
    if (marks.length === 0) {
      doc.fontSize(10).text('Hakuna matokeo yaliyoidhinishwa kwa muhula huu.', 56, y + 10);
      y += 36;
    } else {
      marks.forEach((mark, index) => {
        if (index % 2 === 0) doc.rect(48, y, 499, 20).fill('#F6F1E6');
        doc.fillColor('#17241E').fontSize(10);
        doc.text(mark.subject.name, 56, y + 5, { width: 200 });
        doc.text(mark.marks == null ? '—' : String(mark.marks), 280, y + 5);
        doc.text(mark.grade || '—', 380, y + 5);
        doc.text(mark.remarks || '', 450, y + 5, { width: 90 });
        y += 20;
      });
    }

    y += 16;
    doc.fillColor(green).fontSize(11);
    doc.text(`Wastani: ${report?.averageScore ?? '—'}`, 48, y);
    doc.text(`Nafasi: ${report?.position ?? '—'} / ${report?.totalStudents ?? '—'}`, 220, y);
    doc.text(
      `Mahudhurio: ${report?.attendanceDays ?? '—'} / ${report?.totalSchoolDays ?? '—'}`,
      380,
      y,
    );

    y += 36;
    doc.fillColor('#17241E').fontSize(11).text('Maoni ya mwalimu', 48, y);
    doc.fontSize(10).fillColor('#5C6B63').text(report?.teacherComment || '—', 48, y + 16, { width: 240 });
    doc.fillColor('#17241E').fontSize(11).text('Maoni ya mkuu wa shule', 310, y);
    doc.fontSize(10).fillColor('#5C6B63').text(report?.headComment || '—', 310, y + 16, { width: 230 });

    const signY = 700;
    doc.moveTo(48, signY).lineTo(200, signY).strokeColor('#1B4D3E').stroke();
    doc.moveTo(240, signY).lineTo(392, signY).strokeColor('#1B4D3E').stroke();
    doc.moveTo(420, signY).lineTo(547, signY).strokeColor('#1B4D3E').stroke();
    doc.fontSize(8).fillColor('#5C6B63');
    doc.text('Sahihi ya mwalimu', 48, signY + 6);
    doc.text('Sahihi ya mkuu wa shule', 240, signY + 6);
    doc.text('Muhuri wa shule', 420, signY + 6);

    doc.end();
    return done;
  }
}
