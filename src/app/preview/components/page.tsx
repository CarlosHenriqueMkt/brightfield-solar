import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Hero } from '@/components/sections/Hero';
import { ProcessSteps } from '@/components/sections/ProcessSteps';
import { SocialProof } from '@/components/sections/SocialProof';
import { FAQ } from '@/components/sections/FAQ';
import { FinalCTA } from '@/components/sections/FinalCTA';
import { Button } from '@/components/ui/Button';
import { MediaPlaceholder } from '@/components/ui/MediaPlaceholder';
import { getCityBySlug } from '@/domain/cities/cities';
import { SimPreview } from './SimPreview';
import styles from './preview.module.css';

export const metadata: Metadata = {
  title: 'Brightfield Solar — Component preview',
  robots: { index: false, follow: false },
};

export default function ComponentsPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const city = getCityBySlug('phoenix-az');
  if (!city) notFound();

  return (
    <main>
      <header className={styles.pageHeader}>
        <h1>Brightfield component preview</h1>
        <p>
          Development only. Isolated components and visual states from the
          approved OpenDesign v2, not the final landing page. All estimates are
          fixed fictional fixtures; no calculation or renderer is connected.
        </p>
        <p>
          Image permissions are not confirmed. Neutral placeholders preserve the
          media spaces and overlays without distributing the source PNGs.
        </p>
        <nav className={styles.navigation} aria-label="Component previews">
          <a href="#hero-preview">Hero</a>
          <a href="#drawer-previews">Drawer states</a>
          <a href="#process-preview">Process</a>
          <a href="#social-preview">Social proof</a>
          <a href="#faq-preview">FAQ</a>
          <a href="#final-preview">Final CTA</a>
        </nav>
      </header>

      <section className={styles.sample}>
        <header className={styles.sampleLabel}>
          <p>Hero · closed / open visual drawer</p>
          <p>
            Server-rendered copy over a full-area sceneSlot. The controlled
            drawer is non-modal; Escape and Close return focus to the launcher.
            Closing preserves inputs and the current step.
          </p>
        </header>
        <Hero
          id="hero-preview"
          city={city}
          headingAs="h2"
          sceneSlot={
            <MediaPlaceholder
              label="Neutral scene placeholder · WEB 03"
              className={styles.heroPlaceholder}
            />
          }
          controlsSlot={
            <SimPreview
              city={city}
              id="hero-drawer"
              initiallyOpen={false}
              embedded
            />
          }
        />
      </section>

      <section
        id="drawer-previews"
        className={styles.sample}
        aria-label="Isolated simulator drawer states"
      >
        <header className={styles.sampleLabel}>
          <p>SimDrawer · four approved states and boundary fixture</p>
          <p>
            Inputs and profile selections are interactive. Results never
            recalculate; choose a labeled presentation fixture to inspect the
            minimum and savings-cap notices.
          </p>
        </header>
        <div className={styles.simGrid}>
          <section aria-labelledby="bill-preview-title">
            <h2 id="bill-preview-title">Bill · 1 / 2</h2>
            <SimPreview city={city} id="bill-drawer" initialStep="bill" />
          </section>
          <section aria-labelledby="coverage-preview-title">
            <h2 id="coverage-preview-title">Coverage · 2 / 2</h2>
            <SimPreview
              city={city}
              id="coverage-drawer"
              initialStep="coverage"
            />
          </section>
          <section aria-labelledby="result-preview-title">
            <h2 id="result-preview-title">Result · approved fixture</h2>
            <SimPreview city={city} id="result-drawer" initialStep="result" />
          </section>
          <section aria-labelledby="edit-preview-title">
            <h2 id="edit-preview-title">Edit · both inputs</h2>
            <SimPreview city={city} id="edit-drawer" initialStep="edit" />
          </section>
          <section aria-labelledby="boundary-preview-title">
            <h2 id="boundary-preview-title">Boundary · all approved notices</h2>
            <SimPreview
              city={city}
              id="boundary-drawer"
              initialStep="result"
              initialFixture="minimum"
            />
          </section>
        </div>
      </section>

      <section className={styles.sample}>
        <header className={styles.sampleLabel}>
          <p>ProcessSteps · all three steps open</p>
          <p>
            Alternating media/copy on desktop; text then media for every step on
            mobile. Editorial copy is preserved from the export and remains
            marked provisional in its source.
          </p>
        </header>
        <ProcessSteps id="process-preview" />
      </section>

      <section className={styles.sample}>
        <header className={styles.sampleLabel}>
          <p>SocialProof · featured and manual navigation</p>
          <p>
            Complete quotes and crew data come from the server. No autoplay; use
            the arrow buttons or keyboard navigation. Crew names stay over the
            portrait spaces.
          </p>
        </header>
        <SocialProof
          id="social-preview"
          city={city}
          testimonials={city.testimonials}
          crews={city.crews}
          variant="featured"
        />
      </section>
      <section className={styles.sample}>
        <header className={styles.sampleLabel}>
          <p>SocialProof · all testimonials</p>
          <p>
            The complementary all-quotes state in details(), without carousel
            controls.
          </p>
        </header>
        <SocialProof
          id="social-all-preview"
          city={city}
          testimonials={city.testimonials}
          crews={city.crews}
          variant="all"
        />
      </section>

      <section className={styles.sample}>
        <header className={styles.sampleLabel}>
          <p>FAQ · first expanded</p>
          <p>
            Native details/summary: Enter or Space expands/collapses each
            question. Full answers remain in the initial HTML.
          </p>
        </header>
        <FAQ id="faq-preview" items={city.faq} initiallyExpanded="first" />
      </section>
      <section className={styles.sample}>
        <header className={styles.sampleLabel}>
          <p>FAQ · all expanded</p>
          <p>The complete-copy state shown in the reference details().</p>
        </header>
        <FAQ id="faq-all-preview" items={city.faq} initiallyExpanded="all" />
      </section>
      <section className={styles.sample}>
        <header className={styles.sampleLabel}>
          <p>FinalCTA · resting state</p>
          <p id="assessment-preview-note">
            Presentation only. The assessment action is visibly disabled; no
            request, scheduling or navigation is performed.
          </p>
        </header>
        <FinalCTA
          id="final-preview"
          action={
            <Button
              variant="light"
              disabled
              aria-describedby="assessment-preview-note"
            >
              Request a home assessment
            </Button>
          }
        />
      </section>
    </main>
  );
}
