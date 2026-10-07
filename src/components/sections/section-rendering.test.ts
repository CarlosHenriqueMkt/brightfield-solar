// @vitest-environment jsdom

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getCityBySlug } from '@/domain/cities/cities';
import { ScenePoster } from '@/features/scene/ScenePoster';
import { FinalCTA } from './FinalCTA';
import { Hero } from './Hero';
import { ProcessSteps } from './ProcessSteps';
import { SocialProof } from './SocialProof';

const demoSlugs = ['city-a', 'city-b'] as const;

describe('city presentation sections', () => {
  it.each(demoSlugs)('renders configured content and media for %s', (slug) => {
    const city = getCityBySlug(slug);
    if (!city) throw new Error(`Missing shipped demo ${slug}`);

    const hero = renderToStaticMarkup(
      createElement(Hero, {
        city,
        sceneSlot: null,
        controlsSlot: null,
      }),
    );
    expect(hero).toContain(city.hero.description);
    if (city.designation.kind === 'demo') {
      expect(hero).toContain(city.designation.notice);
    }

    const process = renderToStaticMarkup(createElement(ProcessSteps, { city }));
    expect(process).toContain(city.process.eyebrow);
    expect(process).toContain(city.process.title);
    for (const step of city.process.steps) {
      expect(process).toContain(step.title);
      expect(process).toContain(step.copy);
      expect(
        process.includes(step.image.src) ||
          process.includes(encodeURIComponent(step.image.src)),
      ).toBe(true);
      expect(process).toContain(`alt="${step.image.alt}"`);
    }

    const finalCta = renderToStaticMarkup(
      createElement(FinalCTA, { city, action: null }),
    );
    expect(finalCta).toContain(city.finalCTA.title);
    expect(finalCta).toContain(city.finalCTA.description);
    expect(
      finalCta.includes(city.finalCTA.image.src) ||
        finalCta.includes(encodeURIComponent(city.finalCTA.image.src)),
    ).toBe(true);
    expect(finalCta).toContain(`alt="${city.finalCTA.image.alt}"`);

    const social = renderToStaticMarkup(createElement(SocialProof, { city }));
    expect(social).toContain(city.socialProof.testimonialEyebrow);
    expect(social).toContain(city.socialProof.testimonialTitle);
    expect(social).toContain(city.socialProof.crewEyebrow);
    expect(social).toContain(city.socialProof.crewTitle);
    expect(social).toContain(
      `aria-label="${city.socialProof.testimonialsLabel}"`,
    );
    for (const crew of city.crews) {
      expect(
        social.includes(crew.portrait.src) ||
          social.includes(encodeURIComponent(crew.portrait.src)),
      ).toBe(true);
      expect(social).toContain(`alt="${crew.portrait.alt}"`);
    }

    const poster = renderToStaticMarkup(createElement(ScenePoster, { city }));
    expect(
      poster.includes(city.scenePoster.desktopSrc) ||
        poster.includes(encodeURIComponent(city.scenePoster.desktopSrc)),
    ).toBe(true);
    expect(
      poster.includes(city.scenePoster.mobileSrc) ||
        poster.includes(encodeURIComponent(city.scenePoster.mobileSrc)),
    ).toBe(true);
    expect(poster).toContain(`alt="${city.scenePoster.alt}"`);
  });

  it('keeps configured portrait associations in the reordered four-crew demo', () => {
    const city = getCityBySlug('city-b');
    if (!city) throw new Error('Missing shipped demo city-b');
    const reordered = {
      ...city,
      crews: [city.crews[3], city.crews[1], city.crews[0], city.crews[2]],
    };
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(
      createElement(SocialProof, { city: reordered }),
    );
    const portraits = Array.from(container.querySelectorAll('article'))
      .filter((article) => article.querySelector('img'))
      .map((article) => {
        const image = article.querySelector('img')!;
        const source = new URL(image.src).searchParams.get('url');
        return {
          name: article.querySelector('img + p')?.textContent,
          source,
          alt: image.alt,
        };
      });
    expect(portraits).toEqual(
      reordered.crews.map((crew) => ({
        name: crew.name,
        source: crew.portrait.src,
        alt: crew.portrait.alt,
      })),
    );
  });
});
