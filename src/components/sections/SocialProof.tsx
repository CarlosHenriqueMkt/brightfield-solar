import Image from 'next/image';
import type { ReactElement } from 'react';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import type { CityConfig } from '@/domain/cities/city-config';
import { TestimonialCarousel } from './TestimonialCarousel';
import styles from './SocialProof.module.css';

type Testimonial = CityConfig['testimonials'][number];
type Crew = CityConfig['crews'][number];

export type SocialProofProps = {
  city: Pick<CityConfig, 'socialProof' | 'testimonials' | 'crews'>;
  variant?: 'featured' | 'all';
  id?: string;
};

const usDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
});

function formatUsDate(date: string) {
  return usDateFormatter.format(new Date(`${date}T00:00:00Z`));
}

function testimonialCard(
  testimonial: Testimonial,
  className = '',
): ReactElement {
  return (
    <article
      key={`${testimonial.author}-${testimonial.date}`}
      className={`${styles.quote} ${className}`}
    >
      <blockquote>“{testimonial.quote}”</blockquote>
      <footer className={styles.quoteMeta}>
        <strong>{testimonial.author}</strong>
        <span>
          {testimonial.neighborhood} · {formatUsDate(testimonial.date)}
        </span>
      </footer>
    </article>
  );
}
function crewCard(crew: Crew): ReactElement {
  return (
    <article key={`${crew.name}-${crew.since}`} className={styles.crewCard}>
      <div className={styles.crewPortrait}>
        <Image
          src={crew.portrait.src}
          alt={crew.portrait.alt}
          width={1122}
          height={1402}
          className={styles.crewImage}
          sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1440px) 30vw, 416px"
        />
        <p className={styles.crewName}>{crew.name}</p>
      </div>
      <div className={styles.crewInfo}>
        <dl className={styles.metrics}>
          <div>
            <dt>installs</dt>
            <dd>{crew.installs.toLocaleString('en-US')}</dd>
          </div>
          <div>
            <dt>rating</dt>
            <dd>{crew.rating.toFixed(1)}/5</dd>
          </div>
          <div>
            <dt>since</dt>
            <dd>{crew.since}</dd>
          </div>
        </dl>
        <p className={styles.crewBlurb}>{crew.blurb}</p>
        <p className={styles.illustrative}>
          Illustrative image · fictional crew
        </p>
      </div>
    </article>
  );
}

export function SocialProof({
  city,
  variant = 'featured',
  id,
}: SocialProofProps) {
  const sectionId = id ?? 'social-proof';
  const headingId = `${sectionId}-heading`;
  const testimonials = city.testimonials;
  const crews = city.crews;
  const featuredTestimonials =
    testimonials.length > 2
      ? [
          testimonials[testimonials.length - 1],
          testimonials[0],
          testimonials[1],
        ]
      : testimonials;
  const selectedTestimonials =
    variant === 'featured' ? featuredTestimonials : testimonials;
  const slides = selectedTestimonials.map((testimonial) => ({
    id: `${testimonial.author}-${testimonial.date}`,
    label: testimonial.author,
    content: testimonialCard(testimonial),
  }));

  return (
    <section
      id={sectionId}
      className={styles.section}
      aria-labelledby={headingId}
    >
      <Container>
        <SectionHeading
          id={headingId}
          eyebrow={city.socialProof.testimonialEyebrow}
          title={city.socialProof.testimonialTitle}
        />
        {variant === 'featured' ? (
          <TestimonialCarousel
            slides={slides}
            ariaLabel={city.socialProof.testimonialsLabel}
          />
        ) : (
          <div
            className={styles.allQuotes}
            aria-label={city.socialProof.testimonialsLabel}
          >
            {slides.map((slide) => slide.content)}
          </div>
        )}

        <div className={styles.crewsSection}>
          <SectionHeading
            id={`${headingId}-crews`}
            eyebrow={city.socialProof.crewEyebrow}
            title={city.socialProof.crewTitle}
          />
          <div className={styles.crewGrid}>
            {crews.map((crew) => crewCard(crew))}
          </div>
        </div>
      </Container>
    </section>
  );
}
