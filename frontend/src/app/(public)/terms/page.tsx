import Link from 'next/link';
import { PageHero } from '@/components/site/section-heading';

import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata(
  'Terms of use',
  'Rules for using the Sombetini digital platform, portals, results, and fees.',
  { path: '/terms' },
);

const LAST_UPDATED = '29 September 2026';

const sections: { title: string; body: string[] }[] = [
  {
    title: '1. Agreement',
    body: [
      'These Terms of Use (“Terms”) govern access to and use of the Sombetini Primary School digital platform: the public website, Parent Portal, Teacher Portal, administration tools, APIs, and related services (together, the “Platform”).',
      'By creating an account, signing in, or continuing to use the Platform, you agree to these Terms and to the Privacy Policy. If you do not agree, do not use the Platform.',
      'The Platform is operated by Sombetini Primary School, Arusha, Tanzania (“the School”, “we”, “us”).',
    ],
  },
  {
    title: '2. Who may use the Platform',
    body: [
      'Parents and legal guardians may create a parent account to follow children who are enrolled at the School and linked to their account by the school office.',
      'Teachers and administrative staff use accounts created or authorised by the School. Staff must use the Platform only for official school duties.',
      'Pupils do not create independent accounts on this Platform. Information about pupils is managed through parent and staff accounts under school policies.',
      'You must provide accurate information. You must not impersonate another person or create an account for someone else without authority.',
    ],
  },
  {
    title: '3. Accounts and security',
    body: [
      'You are responsible for keeping your password and any two-factor authentication device confidential. Do not share your login with other people.',
      'Notify the school office promptly if you suspect unauthorised access to your account.',
      'The School may suspend or close accounts that appear compromised, misused, inactive for a long period, or linked to inaccurate information.',
      'Parents who self-register may need to confirm their email (by link or by the school office) before the portal is fully available.',
    ],
  },
  {
    title: '4. Parent Portal and linked children',
    body: [
      'A parent account shows only children that the School has linked to that account. If a child is missing or wrongly linked, contact the school office — do not attempt to access another family’s records.',
      'You may view approved examination results, published report cards, fee control numbers for linked children, and notices the School makes available to parents.',
      'Linking a child does not replace official school admission, transfer, or fee decisions. Those remain with the School under its policies and applicable law.',
    ],
  },
  {
    title: '5. Teachers and school office',
    body: [
      'Teachers may enter and submit marks only for classes and subjects they are assigned. Draft marks are not final until approved under the School’s result workflow.',
      'Administrators must use office tools lawfully, protect pupil data, and follow internal procedures for publishing notices, fees, results, and documents.',
      'Every meaningful change to marks and many office actions are recorded in audit logs. Staff must not attempt to bypass these controls.',
    ],
  },
  {
    title: '6. Academic records and results',
    body: [
      'Examination results and report cards shown in the portal are school records. Official printouts or stamped documents from the school office take precedence if there is a discrepancy.',
      'The public “verify a result” feature is only for reference numbers the School has published. It must not be used to probe for other pupils’ data.',
      'Parents should raise marking or report queries with the class teacher or academic office through the School’s normal channels.',
    ],
  },
  {
    title: '7. Fees and control numbers',
    body: [
      'Fee items and amounts are set by the School. A control number generated in the portal is an instruction to pay through the School’s designated payment channel (for example a bank or GePG when connected).',
      'Generating a control number does not itself mean fees are paid. A charge is marked paid only when the School’s payment provider reports success, or when the school office confirms a valid receipt under school procedure.',
      'Until a live payment gateway is connected, the Platform may issue mock or manual control numbers for testing or office workflows. Those must not be treated as a completed government payment.',
      'Failed, expired, or cancelled control numbers may need to be regenerated. Keep payment receipts until the portal shows the correct paid status.',
    ],
  },
  {
    title: '8. Acceptable use',
    body: [
      'You must not try to access data, accounts, or systems you are not authorised to use; disrupt the Platform; upload malware or harmful files; scrape or bulk-extract personal data; or use the Platform for spam, fraud, or harassment.',
      'Uploaded files must be appropriate for school use (for example documents and images required by the office). Do not upload illegal or abusive content.',
      'The School may remove content, revoke access, and cooperate with authorities where required by law.',
    ],
  },
  {
    title: '9. Public website and school content',
    body: [
      'News, events, documents, gallery images, and school profile text are published by the School. They may be updated or withdrawn at any time.',
      'Unless otherwise stated, Platform design, software, and school-owned content remain the property of the School or its licensors. You may not copy the Platform for commercial use without written permission.',
      'Contact-form messages are used only to respond to your enquiry, as described in the Privacy Policy.',
    ],
  },
  {
    title: '10. Msaidizi wa Sombetini (assistant)',
    body: [
      'The assistant answers from an approved FAQ list and, where configured, a language model. It is a guide — not a replacement for the school office, teachers, or official notices.',
      'Do not send passwords, control-number secrets, or other families’ personal data to the assistant. Answers may be incomplete or imperfect; confirm important matters with the School.',
    ],
  },
  {
    title: '11. Availability and changes',
    body: [
      'The School aims to keep the Platform available but does not guarantee uninterrupted access. Maintenance, outages, or connectivity problems may occur.',
      'We may change features, these Terms, or the Privacy Policy. Material changes will be reflected on this website. Continued use after an update means you accept the revised Terms.',
      'Last updated: ' + LAST_UPDATED + '.',
    ],
  },
  {
    title: '12. Limitation of liability',
    body: [
      'The Platform is provided to support school–family communication and school operations. To the fullest extent permitted by Tanzanian law, the School is not liable for indirect or consequential loss arising from use of the Platform, temporary unavailability, or reliance on assistant answers alone.',
      'Nothing in these Terms limits liability that cannot be limited by law, including liability for death or personal injury caused by negligence where applicable.',
    ],
  },
  {
    title: '13. Governing law',
    body: [
      'These Terms are governed by the laws of the United Republic of Tanzania. Disputes that cannot be resolved with the school office may be brought before the competent courts in Arusha, unless mandatory law provides otherwise.',
    ],
  },
  {
    title: '14. Contact',
    body: [
      'Questions about these Terms, privacy, or your account: use the contact form on this website or the phone and email published on the Contact page during office hours.',
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Terms of use"
        title="Rules for using the Sombetini digital platform"
        text="These terms cover parent, teacher, and office accounts, results, fees, and acceptable use. They work together with our Privacy Policy."
      />
      <section className="container-x py-12">
        <p className="text-sm text-muted-foreground">
          Last updated: {LAST_UPDATED}. See also the{' '}
          <Link href="/privacy" className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="prose-school mt-10 max-w-3xl space-y-10">
          {sections.map((section) => (
            <article key={section.title}>
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
          <p className="text-xs text-muted-foreground">
            This page is school operating documentation for the Platform. It is not a substitute for professional legal advice. The School may update it as practice or law requires.
          </p>
        </div>
      </section>
    </>
  );
}
