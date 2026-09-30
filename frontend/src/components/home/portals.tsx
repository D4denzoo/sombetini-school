import Link from 'next/link';
import { ArrowUpRight, BookOpen, CalendarDays, CreditCard, GraduationCap, Library, Newspaper, Phone, Users } from 'lucide-react';
import { SectionHeading } from '@/components/site/section-heading';
import { Stagger, StaggerItem } from '@/components/motion';

const featured = [
  { href: '/login?portal=parent', title: 'Parent Portal', text: 'Results, report cards, fees and school messages for every child on your account.', icon: Users, action: 'Sign in' },
  { href: '/login?portal=teacher', title: 'Teacher Portal', text: 'Classes, the gradebook, approvals and teaching materials.', icon: BookOpen, action: 'Staff sign-in' },
];

const services = [
  { href: '/results', title: 'Student results', text: 'Verify a published report with a reference number.', icon: GraduationCap },
  { href: '/login?portal=parent', title: 'Control number', text: 'Request a payment number for school fees and charges.', icon: CreditCard },
  { href: '/resources', title: 'Documents', text: 'Calendars, timetables, rules and parent forms.', icon: Library },
  { href: '/events', title: 'School calendar', text: 'Exams, meetings, sports days and term dates.', icon: CalendarDays },
  { href: '/news', title: 'News & notices', text: 'Official announcements for families.', icon: Newspaper },
  { href: '/contact', title: 'Contact school', text: 'Call, write or send a message to the office.', icon: Phone },
];

export function Portals() {
  return (
    <section className="container-x py-20">
      <SectionHeading eyebrow="Quick access" title="The school in your pocket" text="Stay connected with Sombetini Primary School — access results, fee information, notices, and important updates anytime, from anywhere." />

      <Stagger className="mt-10 grid gap-5 lg:grid-cols-2">
        {featured.map((item) => (
          <StaggerItem key={item.title}>
            <Link href={item.href} className="group relative flex min-h-[13rem] overflow-hidden rounded-[1.75rem] bg-brand-900 p-8 text-white shadow-lift">
              <div className="absolute inset-0 bg-[radial-gradient(500px_200px_at_100%_0%,hsl(var(--gold-400)/0.35),transparent_55%)]" />
              <div className="relative flex h-full flex-col justify-between">
                <item.icon className="h-8 w-8 text-gold-300" />
                <div>
                  <h3 className="font-display text-3xl font-semibold">{item.title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-white/70">{item.text}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-300">
                    {item.action} <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>

      <Stagger className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((item) => (
          <StaggerItem key={item.title}>
            <Link href={item.href} className="group surface flex h-full items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                <item.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-display text-lg font-semibold">{item.title}</span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">{item.text}</span>
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
