import { inflateSync } from 'node:zlib';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import type { CityConfig } from '@/domain/cities/city-config';
import { phoenix } from '@/domain/cities/phoenix';
import { createEstimateSnapshot } from './estimate-document';
import { generateEstimatePdf } from './estimate-pdf';

async function extractText(file: File): Promise<string> {
  const pdf = Buffer.from(await file.arrayBuffer()).toString('latin1');
  const text: string[] = [];
  for (const match of pdf.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    const stream = inflateSync(Buffer.from(match[1], 'latin1')).toString(
      'latin1',
    );
    for (const run of stream.matchAll(/<([0-9a-f]+)>\s*Tj/gi)) {
      text.push(Buffer.from(run[1], 'hex').toString('latin1'));
    }
  }
  return text.join(' ').replace(/\s+/g, ' ');
}

describe('estimate PDF consumer content', () => {
  it.each([
    [90, 100, '$7,796.25', '$90.00', '7.2 years', '9 panels'],
    [60, 100, '$6,930.00', '$60.00', '9.6 years', '8 panels'],
    [60, 50, '$6,930.00', '$60.00', '9.6 years', '8 panels'],
    [600, 100, '$49,376.25', '$600.00', '6.9 years', '57 panels'],
  ])(
    'exports the actual selected bill %d and coverage %d',
    async (bill, coverage, investment, savings, payback, panels) => {
      const file = await generateEstimatePdf(
        createEstimateSnapshot(phoenix, bill, coverage),
      );
      const text = await extractText(file);
      expect(file.type).toBe('application/pdf');
      expect(file.name).toMatch(/\.pdf$/);
      expect(text).toContain('Phoenix');
      expect(text).toContain(`$${bill}.00`);
      expect(text).toContain(`${coverage}%`);
      expect(text).toContain(investment);
      expect(text).toContain(savings);
      expect(text).toContain(payback);
      expect(text).toContain(panels);
      expect(text).toContain('450');
      expect(text).toContain('6.5');
      expect(text).toContain('0.15');
      expect(text).toContain('$1,000');
      expect(text.toLowerCase()).toContain('not tax advice');
    },
  );

  it('includes minimum sizing and no-cash credit information when applicable', async () => {
    const text = await extractText(
      await generateEstimatePdf(createEstimateSnapshot(phoenix, 60, 50)),
    );
    expect(text.toLowerCase()).toContain('minimum');
    expect(text).toContain('8');
    expect(text.toLowerCase()).toContain('not cash');
  });

  it('distinguishes calculated panels from the illustrative roof limit', async () => {
    const text = await extractText(
      await generateEstimatePdf(createEstimateSnapshot(phoenix, 600, 100)),
    );
    expect(text).toContain('57');
    expect(text).toContain('51');
    expect(text.toLowerCase()).toContain('illustrative');
  });

  it('captures values and assumptions rather than retaining a mutable city reference', () => {
    const city: { -readonly [K in keyof CityConfig]: CityConfig[K] } = {
      ...phoenix,
    };
    const snapshot = createEstimateSnapshot(city, 90, 100);
    city.city = 'Changed';
    city.utilityRatePerKwh = 0.3;
    expect(snapshot.cityLabel).toContain('Phoenix');
    expect(snapshot.explanation).toContain('0.15');
    expect(snapshot.result.investment).toBe('$7,796.25');
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.estimate)).toBe(true);
    expect(Object.isFrozen(snapshot.notices)).toBe(true);
    expect(Object.isFrozen(snapshot.result)).toBe(true);
  });

  it('invalidates identity when a captured city assumption or either input changes', () => {
    const baseline = createEstimateSnapshot(phoenix, 90, 100);
    expect(createEstimateSnapshot({ ...phoenix }, 90, 100).key).toBe(
      baseline.key,
    );
    expect(createEstimateSnapshot(phoenix, 100, 100).key).not.toBe(
      baseline.key,
    );
    expect(createEstimateSnapshot(phoenix, 90, 95).key).not.toBe(baseline.key);
    for (const city of [
      { ...phoenix, city: 'Tempe' },
      { ...phoenix, utilityName: 'Another utility' },
      { ...phoenix, utilityRatePerKwh: 0.16 },
      { ...phoenix, peakSunHoursPerDay: 6 },
      { ...phoenix, panelWatts: 400 },
      { ...phoenix, performanceRatio: 0.75 },
      { ...phoenix, costPerWattInstalled: 3 },
      { ...phoenix, minPanels: 10 },
      { ...phoenix, federalCreditRate: 0.25 },
      { ...phoenix, stateIncentiveNote: 'Different incentive eligibility.' },
    ]) {
      expect(createEstimateSnapshot(city, 90, 100).key).not.toBe(baseline.key);
    }
  });

  it('uses selected inputs in a filesystem-safe meaningful filename', async () => {
    const file = await generateEstimatePdf(
      createEstimateSnapshot(
        {
          ...phoenix,
          slug: '../Phoenix:AZ?*',
        },
        60,
        50,
      ),
    );
    expect(file.name.toLowerCase()).toContain('phoenix');
    expect(file.name).toContain('60');
    expect(file.name).toContain('50');
    expect(file.name).not.toMatch(/[<>:"/\\|?*]/);
    expect(
      Array.from(file.name).some((character) => character.charCodeAt(0) < 32),
    ).toBe(false);
  });

  it('keeps long paragraphs and unbroken words on paginated pages without losing the final text', async () => {
    const city = {
      ...phoenix,
      city: 'Phoenix metropolitan service area '.repeat(5),
      stateIncentiveNote: [
        'State incentive eligibility depends on the installation and tax circumstances. '.repeat(
          65,
        ),
        'A'.repeat(220),
        'Final eligibility marker.',
      ].join(' '),
    };
    const file = await generateEstimatePdf(
      createEstimateSnapshot(city, 90, 100),
    );
    const text = await extractText(file);
    expect(text).toContain('Final eligibility marker.');
    expect(text.toLowerCase()).toContain('not tax advice');
    const document = await PDFDocument.load(await file.arrayBuffer());
    expect(document.getPageCount()).toBeGreaterThan(1);
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const pdf = Buffer.from(await file.arrayBuffer()).toString('latin1');
    let measuredRuns = 0;
    for (const match of pdf.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
      const stream = inflateSync(Buffer.from(match[1], 'latin1')).toString(
        'latin1',
      );
      for (const run of stream.matchAll(
        /\/(\S+)\s+([\d.]+)\s+Tf[\s\S]*?1 0 0 1 ([\d.]+) ([\d.]+) Tm\s*<([0-9a-f]+)>\s*Tj/gi,
      )) {
        measuredRuns += 1;
        const font = run[1].startsWith('Helvetica-Bold') ? bold : regular;
        const size = Number(run[2]);
        const x = Number(run[3]);
        const y = Number(run[4]);
        const content = Buffer.from(run[5], 'hex').toString('latin1');
        expect(x).toBeGreaterThanOrEqual(40);
        expect(x + font.widthOfTextAtSize(content, size)).toBeLessThanOrEqual(
          572.01,
        );
        expect(y).toBeGreaterThanOrEqual(28);
        expect(y + size).toBeLessThanOrEqual(764);
      }
    }
    expect(measuredRuns).toBeGreaterThan(30);
    for (let page = 1; page <= document.getPageCount(); page += 1) {
      expect(text).toContain(`Page ${page} of ${document.getPageCount()}`);
    }
  });
  it('rejects unsupported font characters rather than silently altering estimate text', async () => {
    const snapshot = createEstimateSnapshot(
      { ...phoenix, city: 'Phoenix 太陽' },
      90,
      100,
    );
    await expect(generateEstimatePdf(snapshot)).rejects.toThrow();
  });
});
