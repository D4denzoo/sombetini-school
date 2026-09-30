import { Injectable } from '@nestjs/common';
import { AnnouncementStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  description?: string;
  url?: string;
  category?: string;
  relevance: number;
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(query: string, types?: string[], limit = 20) {
    if (!query || query.trim().length < 2) {
      return { query, results: [], total: 0 };
    }

    const normalizedQuery = query.trim().toLowerCase();
    const searchTypes = types?.length ? types.filter((type) => type !== 'resources') : ['announcements', 'events', 'documents', 'faqs'];
    const results: SearchResult[] = [];

    const searches = searchTypes.map(async (type) => {
      switch (type) {
        case 'announcements':
          return this.searchAnnouncements(normalizedQuery);
        case 'events':
          return this.searchEvents(normalizedQuery);
        case 'documents':
          return this.searchDocuments(normalizedQuery);
        case 'resources':
          return this.searchResources(normalizedQuery);
        case 'faqs':
          return this.searchFaqs(normalizedQuery);
        default:
          return [];
      }
    });

    const allResults = await Promise.all(searches);
    for (const group of allResults) {
      results.push(...group);
    }

    results.sort((a, b) => b.relevance - a.relevance);
    const limited = results.slice(0, Math.min(Math.max(limit, 1), 20));

    return { query, results: limited, total: limited.length };
  }

  private scoreMatch(text: string, query: string): number {
    const lower = text.toLowerCase();
    if (lower === query) return 10;
    if (lower.startsWith(query)) return 8;
    if (lower.includes(query)) return 5;
    const words = query.split(/\s+/);
    const matched = words.filter(w => lower.includes(w)).length;
    return matched > 0 ? matched * 2 : 0;
  }

  private async searchAnnouncements(query: string): Promise<SearchResult[]> {
    const items = await this.prisma.announcement.findMany({
      where: {
        status: AnnouncementStatus.PUBLISHED,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
    return items.map(a => ({
      type: 'announcement',
      id: a.id,
      title: a.title,
      description: a.description.substring(0, 200),
      url: `/news/${a.slug}`,
      category: a.category,
      relevance: this.scoreMatch(a.title, query),
    }));
  }

  private async searchEvents(query: string): Promise<SearchResult[]> {
    const items = await this.prisma.event.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
    return items.map(e => ({
      type: 'event',
      id: e.id,
      title: e.title,
      description: e.description?.substring(0, 200),
      url: `/events`,
      category: e.category,
      relevance: this.scoreMatch(e.title, query),
    }));
  }

  private async searchDocuments(query: string): Promise<SearchResult[]> {
    const items = await this.prisma.document.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
    return items.map(d => ({
      type: 'document',
      id: d.id,
      title: d.title,
      description: d.description?.substring(0, 200),
      url: `/resources`,
      category: d.category,
      relevance: this.scoreMatch(d.title, query),
    }));
  }

  private async searchResources(query: string): Promise<SearchResult[]> {
    const items = await this.prisma.learningResource.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { topic: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
    return items.map(r => ({
      type: 'resource',
      id: r.id,
      title: r.title,
      description: r.description?.substring(0, 200),
      url: `/resources`,
      category: r.resourceType,
      relevance: this.scoreMatch(r.title, query),
    }));
  }

  private async searchFaqs(query: string): Promise<SearchResult[]> {
    const items = await this.prisma.aiFaq.findMany({
      where: {
        isActive: true,
        OR: [
          { question: { contains: query, mode: 'insensitive' } },
          { questionSw: { contains: query, mode: 'insensitive' } },
          { answer: { contains: query, mode: 'insensitive' } },
          { keywords: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
    return items.map(f => ({
      type: 'faq',
      id: f.id,
      title: f.questionSw || f.question,
      description: (f.answerSw || f.answer).substring(0, 200),
      category: f.category || undefined,
      relevance: this.scoreMatch(f.question, query),
    }));
  }
}
