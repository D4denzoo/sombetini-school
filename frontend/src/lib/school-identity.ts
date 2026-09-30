/**
 * Official Sombetini Primary School identity copy.
 * Used on the public site when the database has not yet been filled, and as the
 * structured source for core-value descriptions (the DB field stores names only).
 */
export const SCHOOL_MOTTO = 'Learning Today, Leading Tomorrow.';

/** OSM place: Sombetini Primary School, Sombetini Avenue, Arusha (−3.39071, 36.66680). */
export const SCHOOL_MAP_LAT = -3.3907096;
export const SCHOOL_MAP_LNG = 36.6667962;
export const SCHOOL_MAP_EMBED_URL =
  `https://www.google.com/maps?q=${SCHOOL_MAP_LAT},${SCHOOL_MAP_LNG}&hl=en&z=17&output=embed`;
export const SCHOOL_MAP_LINK_URL =
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Sombetini Primary School, Sombetini Avenue, Arusha, Tanzania')}`;
export const SCHOOL_ADDRESS = 'Sombetini Avenue, Sombetini, Arusha, Tanzania';

export const SCHOOL_CORE_VALUES = [
  {
    name: 'Integrity',
    description:
      'We teach learners to be honest, responsible, respectful, and trustworthy in everything they do.',
  },
  {
    name: 'Excellence',
    description:
      'We encourage every learner to pursue their best, celebrate progress, and develop a lifelong desire to learn.',
  },
  {
    name: 'Discipline',
    description:
      'We cultivate self-control, responsibility, punctuality, and positive habits that support academic and personal growth.',
  },
  {
    name: 'Respect',
    description:
      'We value every learner, teacher, parent, and member of the community, regardless of their background or abilities.',
  },
  {
    name: 'Service',
    description:
      'We inspire learners to use their knowledge and abilities to help others and contribute positively to society.',
  },
  {
    name: 'Creativity',
    description:
      'We encourage curiosity, critical thinking, innovation, and the confidence to explore new ideas.',
  },
  {
    name: 'Unity',
    description:
      'We believe that strong partnerships between learners, teachers, parents, and the community create a stronger learning environment.',
  },
] as const;

export const SCHOOL_CORE_VALUE_NAMES = SCHOOL_CORE_VALUES.map((value) => value.name).join(', ');

export const SCHOOL_PHILOSOPHY_STATEMENT =
  'Every Child Can Learn, Every Child Can Grow, Every Child Can Make a Difference.';

export const SCHOOL_PHILOSOPHY = [
  SCHOOL_PHILOSOPHY_STATEMENT,
  '',
  'At Sombetini Primary School, we believe education is not only about acquiring knowledge but also about developing character, confidence, creativity, and a sense of responsibility.',
  '',
  'We see every child as unique, capable, and full of potential. Our role is to provide the guidance, opportunities, and supportive environment they need to discover their strengths and develop them.',
  '',
  'Through meaningful learning, strong values, practical skills, and partnership with parents and the community, we prepare learners not only for academic success but also for life beyond the classroom.',
  '',
  'At Sombetini, we educate the mind, shape the character, and inspire the future.',
].join('\n');

export const HEAD_OF_SCHOOL_MESSAGE = [
  'Welcome to Sombetini Primary School.',
  '',
  'Dear Parents, Guardians, Learners, and Visitors,',
  '',
  'It is my great pleasure to welcome you to Sombetini Primary School. We are proud to be a learning community committed to nurturing young minds, building strong character, and giving every child the opportunity to discover and develop their potential.',
  '',
  'At Sombetini, we believe that every child deserves quality education in an environment where they feel safe, valued, supported, and inspired to learn. Our dedicated teachers work closely with parents and guardians to ensure that our learners grow academically, socially, and morally.',
  '',
  'We also believe that education is a shared responsibility. When the school, parents, and community work together, we create a strong foundation for our children\'s future.',
  '',
  'Through knowledge, integrity, discipline, creativity, and service, we aim to prepare our learners not only for academic success but also to become responsible and confident members of society.',
  '',
  'Thank you for placing your trust in Sombetini Primary School. We look forward to walking alongside you as we nurture the leaders, thinkers, and changemakers of tomorrow.',
  '',
  'Welcome to Sombetini — Learning Today, Leading Tomorrow.',
].join('\n');

export const SCHOOL_HISTORY =
  'Sombetini Primary School was established in 1985 in the Sombetini area of Arusha. Since its founding the school has continued to grow and serve the community by providing quality primary education.';

export const SCHOOL_VISION =
  'To be a leading primary school that nurtures confident, disciplined, and creative learners who contribute positively to their community and the nation.';

export const SCHOOL_MISSION =
  'To provide quality, inclusive primary education that develops knowledge, character, and practical skills through dedicated teaching and strong partnerships with families.';

export function resolveMotto(fromSettings?: string | null) {
  const value = fromSettings?.trim();
  return value || SCHOOL_MOTTO;
}

export function resolvePhilosophy(fromSettings?: string | null) {
  const value = fromSettings?.trim();
  return value || SCHOOL_PHILOSOPHY;
}

export function resolveHistory(fromSettings?: string | null) {
  const value = fromSettings?.trim();
  return value || SCHOOL_HISTORY;
}

export function resolveVision(fromSettings?: string | null) {
  const value = fromSettings?.trim();
  return value || SCHOOL_VISION;
}

export function resolveMission(fromSettings?: string | null) {
  const value = fromSettings?.trim();
  return value || SCHOOL_MISSION;
}

/** Prefer structured identity values; fall back to comma-separated names from settings. */
export function resolveCoreValues(fromSettings?: string | null) {
  const names = (fromSettings || '')
    .split(/[,·\n]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (names.length === 0) return [...SCHOOL_CORE_VALUES];

  return names.map((name) => {
    const known = SCHOOL_CORE_VALUES.find((value) => value.name.toLowerCase() === name.toLowerCase());
    return known || { name, description: '' };
  });
}
