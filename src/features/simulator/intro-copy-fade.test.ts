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

function observeIntro(): {
  openingOpacity: number[];
  headingMounted: boolean;
  headingOpacity: number;
  headingVisibility: string;
  lettersExiting: boolean;
  returnVisibility: string[];
  restoredOpacity: number[];
  returnFades: number;
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
        function opacity(element) {
          let value = 1;
          for (let node = element; node; node = node.parentElement)
            value *= Number(getComputedStyle(node).opacity);
          return value;
        }
        copy.forEach(opacity);
        [...heading.querySelectorAll('[data-motto-letter]')].forEach(opacity);
        root.dataset.copyHidden = 'true';
        copy.forEach(opacity);
        const animations = root.getAnimations({ subtree: true });
        for (const animation of animations) {
          animation.pause();
          animation.currentTime = 300;
        }
        const openingOpacity = copy.map(opacity);
        const headingOpacity = opacity(heading);
        const headingVisibility = getComputedStyle(heading).visibility;
        const lettersExiting = [...heading.querySelectorAll('[data-motto-letter]')]
          .every(letter => opacity(letter) > 0 && opacity(letter) < 1);
        root.dataset.introVisible = 'false';
        root.dataset.copyHidden = 'false';
        const returnVisibility = copy.map(element => getComputedStyle(element).visibility);
        root.dataset.introVisible = 'true';
        const restoredOpacity = copy.map(opacity);
        const returnFades = root.getAnimations({ subtree: true })
          .filter(animation => !heading.contains(animation.effect.target)).length;
        document.querySelector('#regression-result').textContent = JSON.stringify({
          openingOpacity, headingMounted: root.querySelector('h1') === heading,
          headingOpacity, headingVisibility, lettersExiting, returnVisibility,
          restoredOpacity, returnFades,
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
  it('finishes supplementary exit while heading letters remain visible and restores without a return fade', () => {
    const observed = observeIntro();
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
});
