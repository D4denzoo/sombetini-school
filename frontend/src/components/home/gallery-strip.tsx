import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from '@/components/site/section-heading';
import { SmartImage } from '@/components/site/smart-image';
import { Stagger, StaggerItem } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { featuredPhotos } from '@/lib/featured-photos';

export function GalleryStrip() {
  const preview = featuredPhotos.slice(0, 4);

  return (
    <section className="container-x py-16">
      <SectionHeading
        eyebrow="School life"
        title="Moments around the campus"
        text="Assembly, lessons, sports, and celebrations that shape a Sombetini day."
        action={{ href: '/gallery', label: 'Open photo gallery' }}
      />
      <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {preview.map((photo) => (
          <StaggerItem key={photo.src}>
            <SmartImage {...photo} label={photo.title} className="aspect-[4/3] rounded-[1.75rem] shadow-card" />
          </StaggerItem>
        ))}
      </Stagger>
      <div className="mt-8 sm:hidden">
        <Button asChild variant="outline">
          <Link href="/gallery">Open photo gallery <ArrowRight /></Link>
        </Button>
      </div>
    </section>
  );
}
