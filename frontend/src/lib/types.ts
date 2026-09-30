export type SchoolSettings = {
  schoolName: string;
  schoolNameSw?: string | null;
  motto?: string | null;
  vision?: string | null;
  mission?: string | null;
  coreValues?: string | null;
  history?: string | null;
  academicPhilosophy?: string | null;
  achievements?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  postalAddress?: string | null;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
  emergencyPhone?: string | null;
  workingHours?: string | null;
  mapEmbedUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  twitterUrl?: string | null;
  whatsappNumber?: string | null;
  showFacebook?: boolean;
  showInstagram?: boolean;
  showYoutube?: boolean;
  showTwitter?: boolean;
  showWhatsapp?: boolean;
  yearsOfService?: number;
  primaryColor?: string;
  secondaryColor?: string;
};

export type Leader = {
  id: string;
  name: string;
  position: string;
  positionSw?: string | null;
  photoUrl?: string | null;
  welcomeMessage?: string | null;
  biography?: string | null;
  isHead?: boolean;
};

export type Stats = {
  studentCount: number;
  teacherCount: number;
  parentCount: number;
  classCount: number;
  currentAcademicYear?: string | null;
};

export type PublicSettings = {
  settings: SchoolSettings | null;
  leadership: Leader[];
  stats: Stats;
  platform?: { paymentsMode: 'mock' | 'live' };
};

export type Announcement = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  featuredImage?: string | null;
  isPinned?: boolean;
  publishedAt?: string | null;
  author?: { firstName: string; lastName: string };
  attachments?: { id: string; fileName: string; fileUrl: string; fileSize: number }[];
};

export type SchoolEvent = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  startDate: string;
  endDate?: string | null;
  location?: string | null;
  isAllDay?: boolean;
};

export type Paged<T> = { data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } };

export type Profile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  roles: { name: string; displayName: string }[];
  parent?: {
    id: string;
    children: { id: string; name: string; registrationNo: string; classId: string; class: string; relationship: string; linkStatus?: string }[];
    pendingChildren?: { id: string; name: string; registrationNo: string; classId: string; class: string; relationship: string; linkStatus?: string }[];
  } | null;
  teacher?: {
    id: string;
    staffNo: string;
    assignments: { class: string; subject: string }[];
  } | null;
};
