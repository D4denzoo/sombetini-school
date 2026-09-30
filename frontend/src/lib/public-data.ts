import { cache } from 'react';
import { publicGet } from '@/lib/api';
import type { Announcement, Paged, PublicSettings, SchoolEvent } from '@/lib/types';

/**
 * Request-scoped cache: layout + page in the same navigation share one HTTP call.
 * Combined with Next fetch revalidate, this keeps public clicks light.
 */
export const getPublicSettings = cache(async () => publicGet<PublicSettings>('/settings/public'));

export const getLatestNews = cache(async (limit = 3) =>
  publicGet<Paged<Announcement>>(`/announcements?limit=${limit}`),
);

export const getUpcomingEvents = cache(async (limit = 6) => {
  const today = new Date().toISOString();
  return publicGet<Paged<SchoolEvent>>(
    `/events?limit=${limit}&from=${encodeURIComponent(today)}`,
  );
});

export const getActiveClasses = cache(async () =>
  publicGet<Array<{ id: string; name: string; level: number; section?: string | null; capacity: number; _count?: { students: number } }>>(
    '/classes?isActive=true',
  ),
);

export const getActiveSubjects = cache(async () =>
  publicGet<Array<{ id: string; name: string; code: string; description?: string | null }>>(
    '/subjects?isActive=true',
  ),
);

export const getUpcomingExams = cache(async (limit = 4) =>
  publicGet<Paged<{
    id: string;
    name: string;
    type: string;
    startDate: string;
    endDate: string;
    class?: { name: string } | null;
  }>>(`/examinations?limit=${limit}&isActive=true`),
);

export const getAcademicYears = cache(async () =>
  publicGet<Array<{ id: string; name: string; isCurrent: boolean; terms?: { id: string; name: string }[] }>>(
    '/academic/years',
  ),
);
