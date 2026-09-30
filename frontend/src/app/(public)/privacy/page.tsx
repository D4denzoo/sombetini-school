import Link from 'next/link';
import { Database, EyeOff, FileSearch, ShieldCheck, Trash2, UserCheck } from 'lucide-react';
import { PageHero } from '@/components/site/section-heading';
import { Stagger, StaggerItem } from '@/components/motion';

import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'Privacy',
  'How Sombetini Primary School collects, uses, and protects pupil and family information.',
  { path: '/privacy' },
);

const LAST_UPDATED = '29 September 2026';

const principles = [
  { icon: Database, title: 'Minimum necessary data', text: 'We collect only what is needed to teach pupils, inform parents and run the school: names, classes, guardian contacts, attendance, examination results and fee records.' },
  { icon: UserCheck, title: 'Role-based access', text: 'A parent sees results and payments only for children linked to their account. Teachers see their assigned classes and subjects. Administrators see the operational records their role requires.' },
  { icon: ShieldCheck, title: 'Secure storage', text: 'Passwords are stored as Argon2id hashes. Sessions use HTTP-only cookies with CSRF protection. Connections should use HTTPS in production. Two-factor authentication is available for staff.' },
  { icon: FileSearch, title: 'Audit logs', text: 'Access to and changes of records — including every mark entered or modified — are written to an audit log with time, user and device information.' },
  { icon: Trash2, title: 'Retention and deletion', text: 'The school configures how long notices, tokens, audit rows and related records are kept. Deletion of pupil or parent records is performed through authorised office tools so that it is logged.' },
  { icon: EyeOff, title: 'The assistant', text: 'Msaidizi wa Sombetini answers from an approved knowledge base. It never receives passwords, control-number secrets or other families’ information as part of its designed workflow.' },
];

const detailSections: { title: string; body: string[] }[] = [
  {
    title: 'Controller',
    body: [
      'Sombetini Primary School, Arusha, Tanzania, determines how personal data on this Platform is used for school administration and parent communication.',
    ],
  },
  {
    title: 'What we collect',
    body: [
      'Account data: name, email, optional phone, password hash, login security events, and session device information.',
      'Pupil records: registration number, name, gender, date of birth, class, status, admission date, optional photo and medical notes the office records, attendance, marks, report cards, and fee payment status.',
      'Parent–pupil links, teacher assignments, announcements, documents, gallery media metadata, contact-form messages, and assistant chat history needed to operate the service.',
      'Technical logs: IP address, user agent, request identifiers, and similar security telemetry.',
    ],
  },
  {
    title: 'Why we use it',
    body: [
      'To deliver education administration: classes, examinations, results, report cards, fees, notices, and office workflows.',
      'To let parents follow linked children and to let staff perform assigned duties.',
      'To secure accounts (authentication, rate limiting, audit), prevent abuse, and improve reliability.',
      'To reply to contact messages and, when SMS or email is configured, to send operational messages you have a legitimate expectation to receive (for example password reset or published notices).',
    ],
  },
  {
    title: 'Sharing',
    body: [
      'We do not sell personal data.',
      'Data may be processed by infrastructure providers the School uses to host the Platform (for example a virtual server, email relay, SMS gateway, or payment provider) under contracts or terms that limit use to providing that service.',
      'We may disclose information when required by Tanzanian law, a competent authority, or to protect the vital interests of a child or other person.',
    ],
  },
  {
    title: 'Children',
    body: [
      'This Platform stores educational records of primary-school children. Access is limited by role. Parents and guardians should use the portal only for children they are authorised to follow.',
      'Pupils do not self-register. Public result verification uses published reference numbers and must not be used to search for other children’s data.',
    ],
  },
  {
    title: 'Your requests',
    body: [
      'You may ask the school office to correct inaccurate account or pupil information, or to explain what is held about you or your linked children, through the contact channels on this website.',
      'Some records must be kept for school, examination, or legal retention reasons even if a portal account is closed.',
    ],
  },
  {
    title: 'Cookies and similar technology',
    body: [
      'After sign-in we use HTTP-only cookies for authentication and a CSRF token cookie so that browsers can call the API safely. These are required for the portals to work.',
      'We do not use third-party advertising cookies on the school site.',
    ],
  },
  {
    title: 'Changes',
    body: [
      `This notice may be updated as school practice or law requires. Last updated: ${LAST_UPDATED}.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy policy"
        title="How Sombetini Primary School protects children’s information"
        text="This platform handles the educational records of children. We treat that responsibility seriously. This page explains what we collect, who can see it and how it is protected."
      />
      <section className="container-x py-12">
        <p className="text-sm text-muted-foreground">
          Last updated: {LAST_UPDATED}. Use of the Platform is also governed by our{' '}
          <Link href="/terms" className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300">
            Terms of Use
          </Link>
          .
        </p>
        <Stagger className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {principles.map((item) => (
            <StaggerItem key={item.title}>
              <article className="surface h-full p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200"><item.icon className="h-5 w-5" /></span>
                <h2 className="mt-4 font-display text-lg font-bold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
        <div className="prose-school mt-12 max-w-3xl space-y-10">
          {detailSections.map((section) => (
            <article key={section.title}>
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
          <p>
            Questions about a child’s record, or a request to correct information, can be sent through the{' '}
            <Link href="/contact" className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300">
              contact form
            </Link>{' '}
            or to the email address published on the contact page. The school office responds during working hours.
          </p>
          <p className="text-xs">
            This notice describes how the Platform is designed to handle personal data. It is school documentation, not legal advice. The School should align practices with the Personal Data Protection Act, 2022 and related guidance as advised by counsel.
          </p>
        </div>
      </section>
    </>
  );
}
