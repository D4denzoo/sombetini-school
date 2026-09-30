export type FeaturedPhoto = {
  src: string;
  alt: string;
  title: string;
  category: 'CAMPUS' | 'STUDENTS' | 'SPORTS' | 'CLASSROOMS' | 'GRADUATION';
  motif: 'campus' | 'students' | 'sports' | 'classroom' | 'graduation' | 'generic';
  tone: 'forest' | 'gold' | 'sky' | 'clay';
  wide?: boolean;
};

/**
 * Featured photographs for marketing surfaces.
 */
export const featuredPhotos: FeaturedPhoto[] = [
  { src: '/photos/assembly-courtyard.jpg', alt: 'Pupils in green uniforms gathered for morning assembly in the school courtyard', title: 'Morning assembly', category: 'CAMPUS', motif: 'campus', tone: 'forest' },
  { src: '/photos/pupils-waving.jpg', alt: 'Pupils smiling and waving outside their classroom', title: 'A warm welcome', category: 'STUDENTS', motif: 'students', tone: 'gold' },
  { src: '/photos/classroom-lesson.jpg', alt: 'A teacher leading a mathematics lesson in a bright classroom', title: 'In the classroom', category: 'CLASSROOMS', motif: 'classroom', tone: 'sky' },
  { src: '/photos/courtyard-dance.jpg', alt: 'Pupils dancing together during a cultural day performance', title: 'Cultural day', category: 'STUDENTS', motif: 'students', tone: 'clay' },
  { src: '/photos/sports-team.jpg', alt: 'The school football team lined up with their coach on the playing field', title: 'Football team', category: 'SPORTS', motif: 'sports', tone: 'forest', wide: true },
  { src: '/photos/sports-day.jpg', alt: 'A pupil in a blue sports jersey sprinting on sports day', title: 'Sports day', category: 'SPORTS', motif: 'sports', tone: 'gold' },
  { src: '/photos/graduation.jpg', alt: 'Standard 7 pupils celebrating at their graduation ceremony', title: 'Standard 7 graduation', category: 'GRADUATION', motif: 'graduation', tone: 'sky' },
  { src: '/photos/school-visit.jpg', alt: 'Guests gathered on the school veranda during a community visit', title: 'Community visit', category: 'CAMPUS', motif: 'campus', tone: 'clay' },
];

export const heroPhoto = featuredPhotos[0];
