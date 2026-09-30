import {
  SCHOOL_CORE_VALUES_DETAIL,
  SCHOOL_MOTTO,
  SCHOOL_PHILOSOPHY,
} from '../common/constants/school-identity';
import { Injectable, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { LlmProvider, LLM_PROVIDER } from './providers/llm.provider.interface';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    @Inject(LLM_PROVIDER) private llm: LlmProvider,
  ) {}

  async chat(message: string, sessionId?: string, userId?: string, language = 'sw') {
    const text = (message || '').trim().slice(0, 500);
    if (text.length < 2) throw new BadRequestException('Type a short question for the assistant.');

    const sid = sessionId || uuidv4();

    let conversation = await this.prisma.aiConversation.findFirst({
      where: { sessionId: sid },
    });

    if (!conversation) {
      conversation = await this.prisma.aiConversation.create({
        data: { sessionId: sid, userId, language },
      });
    }

    await this.prisma.aiMessage.create({
      data: { conversationId: conversation.id, role: 'user', content: text },
    });

    const identity = await this.identityAnswer(text);
    const faqMatch = identity ? null : await this.matchFaq(text);
    let response: string;
    let metadata: Record<string, unknown> = {};

    if (identity) {
      response = identity;
      metadata = { source: 'school-profile' };
    } else if (faqMatch) {
      response = language === 'sw' && faqMatch.answerSw ? faqMatch.answerSw : faqMatch.answer;
      metadata = { source: 'faq', faqId: faqMatch.id, confidence: faqMatch.score };
    } else {
      response = await this.llm.generateResponse(text);
      metadata = { source: 'llm' };
    }

    await this.prisma.aiMessage.create({
      data: { conversationId: conversation.id, role: 'assistant', content: response, metadata: metadata as object },
    });

    return {
      sessionId: sid,
      message: response,
      metadata,
      assistant: 'Msaidizi wa Sombetini',
    };
  }

  private async identityAnswer(query: string): Promise<string | null> {
    const normalized = query.toLowerCase();
    const asksVision = /\b(vision|maono)\b/.test(normalized);
    const asksMission = /\b(mission|dhima|dhamira)\b/.test(normalized);
    const asksMotto = /\b(motto|kauli\s*mbiu|slogan)\b/.test(normalized);
    const asksValues = /\b(core\s*values?|values?|maadili)\b/.test(normalized);
    const asksPhilosophy = /\b(philosoph|falsafa|how\s+we\s+teach|educational\s+philosophy)\b/.test(normalized);
    if (!asksVision && !asksMission && !asksMotto && !asksValues && !asksPhilosophy) return null;

    const settings = await this.prisma.schoolSettings.findFirst({
      select: { vision: true, mission: true, motto: true, coreValues: true, academicPhilosophy: true },
    });
    if (!settings) return null;

    const lines: string[] = [];
    if (asksMotto) lines.push(`Motto: ${settings.motto || SCHOOL_MOTTO}`);
    if (asksVision && settings.vision) lines.push(`Vision: ${settings.vision}`);
    if (asksMission && settings.mission) lines.push(`Mission: ${settings.mission}`);
    if (asksValues) {
      lines.push(`Core values:\n${SCHOOL_CORE_VALUES_DETAIL}`);
    }
    if (asksPhilosophy) lines.push(`Educational philosophy:\n${settings.academicPhilosophy || SCHOOL_PHILOSOPHY}`);
    return lines.length ? lines.join('\n\n') : null;
  }

  private async matchFaq(query: string) {
    const faqs = await this.prisma.aiFaq.findMany({ where: { isActive: true } });
    const normalizedQuery = query.toLowerCase().trim();
    const words = normalizedQuery.split(/\s+/);

    let bestMatch: { id: string; answer: string; answerSw: string | null; score: number } | null = null;

    for (const faq of faqs) {
      let score = 0;
      const searchTexts = [faq.question, faq.questionSw, faq.keywords].filter(Boolean).join(' ').toLowerCase();

      for (const word of words) {
        if (word.length > 2 && searchTexts.includes(word)) score += 1;
      }

      if (normalizedQuery.includes(faq.question.toLowerCase())) score += 5;
      if (faq.questionSw && normalizedQuery.includes(faq.questionSw.toLowerCase())) score += 5;

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { id: faq.id, answer: faq.answer, answerSw: faq.answerSw, score };
      }
    }

    return bestMatch && bestMatch.score >= 2 ? bestMatch : null;
  }

  // FAQ CRUD
  async findAllFaqs(page = 1, limit = 20, category?: string) {
    const where = category ? { category } : {};
    const [data, total] = await Promise.all([
      this.prisma.aiFaq.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.aiFaq.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findFaq(id: string) {
    const faq = await this.prisma.aiFaq.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException('FAQ haijapatikana');
    return faq;
  }

  async createFaq(data: { question: string; questionSw?: string; answer: string; answerSw?: string; category?: string; keywords?: string; sortOrder?: number }) {
    return this.prisma.aiFaq.create({ data });
  }

  async updateFaq(id: string, data: Partial<{ question: string; questionSw: string; answer: string; answerSw: string; category: string; keywords: string; isActive: boolean; sortOrder: number }>) {
    await this.findFaq(id);
    return this.prisma.aiFaq.update({ where: { id }, data });
  }

  async removeFaq(id: string) {
    await this.findFaq(id);
    await this.prisma.aiFaq.delete({ where: { id } });
    return { message: 'FAQ imefutwa' };
  }
}
