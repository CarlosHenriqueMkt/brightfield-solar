import { describe, expect, it } from 'vitest';
import { phoenix } from './phoenix';
import { cityMarkdown, escapeMarkdownText } from './city-markdown';

describe('agent-readable financial assumptions', () => {
  it('preserves valid fractional operands rather than rounding them to a different scenario', () => {
    const markdown = cityMarkdown({
      ...phoenix,
      utilityRatePerKwh: 0.155,
      performanceRatio: 0.825,
      costPerWattInstalled: 2.755,
      federalCreditRate: 0.305,
    });
    expect(markdown).toMatch(/\$0\.155 per kWh/);
    expect(markdown).toContain('82.5%');
    expect(markdown).toMatch(/\$2\.755 per watt/);
    expect(markdown).toContain('30.5%');
  });
});

describe('Markdown text boundaries', () => {
  it.each([
    ['- literal statement', '\\- literal statement'],
    ['1. literal statement', '1\\. literal statement'],
    ['    literal statement', 'literal statement'],
  ])(
    'keeps registry text %j literal rather than creating a block',
    (input, expected) => {
      expect(escapeMarkdownText(input)).toBe(expected);
    },
  );
});
