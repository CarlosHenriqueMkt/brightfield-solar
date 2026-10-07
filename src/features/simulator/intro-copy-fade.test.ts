import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Hero } from '@/components/sections/Hero';
import heroStyles from '@/components/sections/Hero.module.css';
import mottoStyles from '@/components/sections/Motto.module.css';
import simulatorStyles from './SimulatorHero.module.css';

function stylesheet(path: URL, classes: Record<string, string>): string {
  return readFileSync(path, 'utf8')
    .replace(/:global\(([^)]+)\)/g, '$1')
    .replace(/\.([a-zA-Z_][\w-]*)/g, (selector, name: string) =>
      classes[name] ? `.${classes[name]}` : selector,
    );
}

function observeIntro(forceReducedMotion = false): {
  openingOpacity: number[];
  intermediateOpacity: number[];
  headingMounted: boolean;
  headingOpacity: number;
  headingOpacityAtIntermediate: number;
  headingVisibility: string;
  headingVisibilityAtIntermediate: string;
  lettersExiting: boolean;
  lettersInFlight: boolean;
  returnVisibility: string[];
  restoredOpacity: number[];
  returnFades: number;
  prefersReducedMotion: boolean;
  reducedImmediateOpacity: number[];
  reducedAnimationCount: number;
} {
  const executable =
    process.env.CHROME_BIN ??
    [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      ...['PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA'].map((key) =>
        join(
          process.env[key] ?? '',
          'Google',
          'Chrome',
          'Application',
          'chrome.exe',
        ),
      ),
    ].find(existsSync);
  if (!executable)
    throw new Error(
      'The native intro CSS regression needs Chromium. Set CHROME_BIN to its executable.',
    );
  const directory = mkdtempSync(join(tmpdir(), 'brightfield-intro-'));
  try {
    const css = [
      stylesheet(
        new URL('../../components/sections/Hero.module.css', import.meta.url),
        heroStyles,
      ),
      stylesheet(
        new URL('../../components/sections/Motto.module.css', import.meta.url),
        mottoStyles,
      ),
      stylesheet(
        new URL('./SimulatorHero.module.css', import.meta.url),
        simulatorStyles,
      ),
    ].join('\n');
    const hero = renderToStaticMarkup(
      createElement(Hero, {
        city: { city: 'Phoenix', stateFull: 'Arizona' },
        sceneSlot: null,
        controlsSlot: createElement(
          Fragment,
          null,
          createElement(
            'a',
            { href: '#solar-estimate', 'data-open-simulation': true },
            'See my solar estimate',
          ),
          createElement(
            'p',
            null,
            'Start with your average monthly electricity bill.',
          ),
        ),
      }),
    );
    const file = join(directory, 'intro.html');
    writeFileSync(
      file,
      `<!doctype html><style>${css}</style>
      <div class="${simulatorStyles.root}" data-copy-hidden="false" data-intro-visible="true">${hero}</div>
      <output id="regression-result"></output>
      <script>
        const root = document.querySelector('[data-copy-hidden]');
        const heading = root.querySelector('h1');
        const copy = [...root.querySelectorAll('p[data-hero-intro], [data-hero-intro] p, [data-hero-intro] a')];
        const letters = [...heading.querySelectorAll('[data-motto-letter]')];
        function opacity(element) {
          let value = 1;
          for (let node = element; node; node = node.parentElement)
            value *= Number(getComputedStyle(node).opacity);
          return value;
        }
        function flush(elements) {
          elements.forEach(opacity);
          void root.offsetWidth;
        }
        flush([...copy, ...letters]);
        root.dataset.copyHidden = 'true';
        flush([...copy, ...letters]);
        const animations = root.getAnimations({ subtree: true });
        const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        let intermediateOpacity = [];
        let openingOpacity;
        let headingOpacityAtIntermediate = opacity(heading);
        let headingVisibilityAtIntermediate = getComputedStyle(heading).visibility;
        let lettersInFlight = false;
        let lettersExiting = false;
        let reducedImmediateOpacity = [];
        let reducedAnimationCount = 0;
        if (prefersReducedMotion) {
          reducedImmediateOpacity = copy.map(opacity);
          reducedAnimationCount = animations.length;
          openingOpacity = reducedImmediateOpacity;
        } else {
          for (const animation of animations) {
            animation.pause();
            animation.currentTime = 0;
          }
          for (const animation of animations) animation.currentTime = 125;
          intermediateOpacity = copy.map(opacity);
          headingOpacityAtIntermediate = opacity(heading);
          headingVisibilityAtIntermediate = getComputedStyle(heading).visibility;
          lettersInFlight = letters.every(letter => {
            const value = opacity(letter);
            return value > 0 && value < 1;
          });
          for (const animation of animations) animation.currentTime = 300;
          openingOpacity = copy.map(opacity);
          lettersExiting = letters.every(letter => {
            const value = opacity(letter);
            return value > 0 && value < 1;
          });
        }
        const headingOpacity = opacity(heading);
        const headingVisibility = getComputedStyle(heading).visibility;
        root.dataset.introVisible = 'false';
        root.dataset.copyHidden = 'false';
        const returnVisibility = copy.map(element => getComputedStyle(element).visibility);
        root.dataset.introVisible = 'true';
        const restoredOpacity = copy.map(opacity);
        const returnFades = root.getAnimations({ subtree: true })
          .filter(animation => !heading.contains(animation.effect.target)).length;
        document.querySelector('#regression-result').textContent = JSON.stringify({
          openingOpacity, intermediateOpacity, headingMounted: root.querySelector('h1') === heading,
          headingOpacity, headingOpacityAtIntermediate, headingVisibility,
          headingVisibilityAtIntermediate, lettersExiting, lettersInFlight,
          returnVisibility, restoredOpacity, returnFades, prefersReducedMotion,
          reducedImmediateOpacity, reducedAnimationCount,
        });
      </script>`,
    );
    const result = spawnSync(
      executable,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--no-first-run',
        ...(forceReducedMotion ? ['--force-prefers-reduced-motion'] : []),
        `--user-data-dir=${join(directory, 'profile')}`,
        '--dump-dom',
        pathToFileURL(file).href,
      ],
      { encoding: 'utf8', timeout: 15000 },
    );
    if (result.error) throw result.error;
    const payload = result.stdout.match(
      /<output id="regression-result">([^<]+)<\/output>/,
    )?.[1];
    if (result.status !== 0 || !payload)
      throw new Error(`Native intro fixture failed: ${result.stderr}`);
    return JSON.parse(payload);
  } finally {
    rmSync(directory, { recursive: true, force: true, maxRetries: 3 });
  }
}

describe('intro supplementary opening fade', () => {
  it('proves a native intermediate fade, completes while heading letters remain visible, and restores without a return fade', () => {
    const observed = observeIntro();
    expect(observed.intermediateOpacity).toHaveLength(5);
    observed.intermediateOpacity.forEach((value) => {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1);
    });
    expect(observed.headingOpacityAtIntermediate).toBe(1);
    expect(observed.headingVisibilityAtIntermediate).toBe('visible');
    expect(observed.lettersInFlight).toBe(true);
    expect(observed.headingMounted).toBe(true);
    expect(observed.headingOpacity).toBe(1);
    expect(observed.headingVisibility).toBe('visible');
    expect(observed.lettersExiting).toBe(true);
    expect(observed.openingOpacity).toEqual([0, 0, 0, 0, 0]);
    expect(observed.returnVisibility).toEqual([
      'hidden',
      'hidden',
      'hidden',
      'hidden',
      'hidden',
    ]);
    expect(observed.restoredOpacity).toEqual([1, 1, 1, 1, 1]);
    expect(observed.returnFades).toBe(0);
  }, 20000);

  it('honors native reduced motion with immediate opacity changes and no tween', () => {
    const observed = observeIntro(true);
    expect(observed.prefersReducedMotion).toBe(true);
    expect(observed.reducedImmediateOpacity).toEqual([0, 0, 0, 0, 0]);
    expect(observed.reducedAnimationCount).toBe(0);
    expect(observed.openingOpacity).toEqual([0, 0, 0, 0, 0]);
    expect(observed.restoredOpacity).toEqual([1, 1, 1, 1, 1]);
    expect(observed.returnVisibility).toEqual([
      'hidden',
      'hidden',
      'hidden',
      'hidden',
      'hidden',
    ]);
    expect(observed.returnFades).toBe(0);
  }, 20000);
});
