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
import { beforeAll, describe, expect, it } from 'vitest';
import { getRegisteredCities } from '@/domain/cities/cities';
import { createEstimateSnapshot } from '@/features/simulator/estimate-document';
import { SimDrawer } from '@/features/simulator/SimDrawer';
import { ProcessSteps } from '../sections/ProcessSteps';
import { SocialProof } from '../sections/SocialProof';
import { FinalCTA } from '../sections/FinalCTA';
import specialistStyles from './SpecialistCTA.module.css';
import buttonStyles from './Button.module.css';
import containerStyles from './Container.module.css';
import processStyles from '../sections/ProcessSteps.module.css';
import socialStyles from '../sections/SocialProof.module.css';
import finalStyles from '../sections/FinalCTA.module.css';
import drawerStyles from '@/features/simulator/SimDrawer.module.css';
import pageStyles from '@/app/city/[citySlug]/page.module.css';

const widths = [1440, 320, 390];
const cities = getRegisteredCities();
const tolerancePx = 1;
type Geometry = {
  width: number;
  city: string;
  placement: string;
  triggerCenter: number;
  containerCenter: number;
  contentCenter: number;
  targetWidth: number;
  targetHeight: number;
  finalActionCenterY: number;
  triggerCenterY: number;
};
let observed: Geometry[];

function stylesheet(path: string, classes: Record<string, string>) {
  return readFileSync(new URL(path, import.meta.url), 'utf8').replace(
    /\.([a-zA-Z_][\w-]*)/g,
    (selector, name: string) =>
      classes[name] ? `.${classes[name]}` : selector,
  );
}

function observeGeometry(): Geometry[] {
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
      'Native CTA geometry needs Chrome/Chromium; set CHROME_BIN.',
    );
  const directory = mkdtempSync(join(tmpdir(), 'brightfield-cta-geometry-'));
  try {
    const css =
      readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8') +
      [
        stylesheet('./Button.module.css', buttonStyles),
        stylesheet('./Container.module.css', containerStyles),
        stylesheet('../sections/ProcessSteps.module.css', processStyles),
        stylesheet('../sections/SocialProof.module.css', socialStyles),
        stylesheet('../sections/FinalCTA.module.css', finalStyles),
        stylesheet(
          '../../features/simulator/SimDrawer.module.css',
          drawerStyles,
        ),
        stylesheet('../../app/city/[citySlug]/page.module.css', pageStyles),
        stylesheet('./SpecialistCTA.module.css', specialistStyles),
      ].join('\n');
    const font = pathToFileURL(
      join(process.cwd(), 'src/app/fonts/ibm-plex-400.ttf'),
    ).href;
    const medium = pathToFileURL(
      join(process.cwd(), 'src/app/fonts/ibm-plex-500.ttf'),
    ).href;
    const semibold = pathToFileURL(
      join(process.cwd(), 'src/app/fonts/ibm-plex-600.ttf'),
    ).href;
    const markup = cities
      .map((city) => {
        const snapshot = createEstimateSnapshot(city, 90, 100);
        return renderToStaticMarkup(
          createElement(
            'div',
            { 'data-city': city.slug },
            createElement(
              Fragment,
              null,
              createElement(ProcessSteps, { city }),
              createElement(SocialProof, { city }),
              createElement(SimDrawer, {
                id: `estimate-${city.slug}`,
                open: true,
                step: 'result',
                values: { bill: '90', coverage: '100' },
                profiles: city.householdProfiles,
                selectedProfile: 0,
                result: snapshot.result,
                notices: snapshot.notices,
                stateIncentiveNote: snapshot.stateIncentiveNote,
                explanation: snapshot.explanation,
                installationHref: '#installation',
                onBillChange: () => {},
                onCoverageChange: () => {},
                onProfileSelect: () => {},
                onStepChange: () => {},
                onOpenChange: () => {},
              }),
              createElement(FinalCTA, {
                city,
                action: createElement(
                  'a',
                  {
                    href: '#solar-estimate',
                    className: pageStyles.lightAction,
                  },
                  'See my solar estimate ',
                  createElement('span', { 'aria-hidden': true }, '→'),
                ),
              }),
            ),
          ),
        );
      })
      .join('');
    const file = join(directory, 'geometry.html');
    const frameMarkup = `<!doctype html><style>${css}
      @font-face{font-family:Plex;src:url('${font}');font-weight:400}
      @font-face{font-family:Plex;src:url('${medium}');font-weight:500}
      @font-face{font-family:Plex;src:url('${semibold}');font-weight:600}
      :root{--font-plex:Plex}</style>${markup}`;
    const frames = widths
      .map(
        (width) =>
          `<iframe width="${width}" height="30000" style="border:0" srcdoc="${frameMarkup.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe>`,
      )
      .join('');
    writeFileSync(
      file,
      `<!doctype html>${frames}<output id="regression-result"></output><script>
      window.addEventListener('load', async () => {
        const rows = [];
        for (const frame of document.querySelectorAll('iframe')) {
          const doc = frame.contentDocument;
          await doc.fonts.ready;
          for (const city of doc.querySelectorAll('[data-city]')) {
            const buttons = [...city.querySelectorAll('button')].filter(button => button.textContent === 'Talk to a solar specialist');
            for (const [index, button] of buttons.entries()) {
              const group = button.parentElement;
              const section = button.closest('section');
              const container = index === 0 ? section.querySelector('ol')
                : index === 1 ? section.querySelector('.${socialStyles.crewGrid}')
                : index === 2 ? section.querySelector('.${drawerStyles.resultActions}')
                : frame.contentWindow.innerWidth <= 640 ? group.parentElement : group;
              const rect = button.getBoundingClientRect();
              const box = container.getBoundingClientRect();
              const text = doc.createRange(); text.selectNodeContents(button);
              const content = text.getBoundingClientRect();
              const action = index === 3 ? group.parentElement.querySelector('a').getBoundingClientRect() : rect;
              rows.push({ width: frame.contentWindow.innerWidth, city: city.dataset.city,
                placement: ['process','crews','results','final'][index],
                triggerCenter: rect.left + rect.width / 2, containerCenter: box.left + box.width / 2,
                contentCenter: content.left + content.width / 2,
                targetWidth: rect.width, targetHeight: rect.height,
                finalActionCenterY: action.top + action.height / 2, triggerCenterY: rect.top + rect.height / 2 });
            }
          }
        }
        document.querySelector('#regression-result').textContent = JSON.stringify(rows);
      });</script>`,
    );
    const result = spawnSync(
      executable,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--no-first-run',
        '--allow-file-access-from-files',
        '--hide-scrollbars',
        '--virtual-time-budget=5000',
        `--user-data-dir=${join(directory, 'profile')}`,
        '--dump-dom',
        pathToFileURL(file).href,
      ],
      { encoding: 'utf8', timeout: 20000, maxBuffer: 4 * 1024 * 1024 },
    );
    if (result.error) throw result.error;
    const payload = result.stdout.match(
      /<output id="regression-result">([^<]+)<\/output>/,
    )?.[1];
    if (result.status !== 0 || !payload)
      throw new Error(`Native geometry fixture failed: ${result.stderr}`);
    return JSON.parse(payload) as Geometry[];
  } finally {
    rmSync(directory, { recursive: true, force: true, maxRetries: 3 });
  }
}

beforeAll(() => {
  observed = observeGeometry();
}, 25000);

describe('native specialist CTA geometry', () => {
  it.each(
    widths.flatMap((width) =>
      cities.map((city) => [width, city.slug] as const),
    ),
  )('centers all four placements at %i CSS pixels for %s', (width, city) => {
    const rows = observed.filter(
      (row) => row.width === width && row.city === city,
    );
    expect(rows.map((row) => row.placement)).toEqual([
      'process',
      'crews',
      'results',
      'final',
    ]);
    for (const row of rows) {
      expect
        .soft(
          Math.abs(row.triggerCenter - row.containerCenter),
          JSON.stringify(row),
        )
        .toBeLessThanOrEqual(tolerancePx);
      expect
        .soft(
          Math.abs(row.contentCenter - row.triggerCenter),
          JSON.stringify(row),
        )
        .toBeLessThanOrEqual(tolerancePx);
      expect(row.targetWidth).toBeGreaterThanOrEqual(44);
      expect(row.targetHeight).toBeGreaterThanOrEqual(44);
      if (row.placement === 'final') {
        if (width === 1440)
          expect(
            Math.abs(row.triggerCenterY - row.finalActionCenterY),
          ).toBeLessThanOrEqual(tolerancePx);
        else expect(row.triggerCenterY).toBeGreaterThan(row.finalActionCenterY);
      }
    }
  });
});
