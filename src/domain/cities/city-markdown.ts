import { getCityDisplayName, type CityConfig } from './city-config';
import { cityDescription, cityTitle } from './city-publication';
import { FICTIONAL_PROJECT_NOTICE, cityUrl } from '../site';

/**
 * Escape text that is interpolated into Markdown while keeping its rendered
 * value readable. Registry values are content, not Markdown, so they must not
 * be able to add links, headings, HTML, or new blocks to this document.
 */
export function escapeMarkdownText(value: string): string {
  return value
    .trim()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[`*_{}()[\]#+|]/g, '\\$&')
    .replace(/^-/, '\\-')
    .replace(/^(\d+)\./, '$1\\.');
}

const percentage = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 20,
});

/** Render the public, agent-readable representation of one registered city. */
export function cityMarkdown(city: CityConfig): string {
  const displayName = escapeMarkdownText(getCityDisplayName(city));
  const cityName = escapeMarkdownText(city.city);
  const title = escapeMarkdownText(cityTitle(city));
  const cityLink = cityUrl(city);
  const neighborhoods = city.popularNeighborhoods
    .map((neighborhood) => escapeMarkdownText(neighborhood))
    .join(', ');

  const processSteps = city.process.steps
    .map(
      (step, index) =>
        `${index + 1}. **${escapeMarkdownText(step.title)}** — ${escapeMarkdownText(step.copy)}`,
    )
    .join('\n');

  const profiles = city.householdProfiles
    .map(
      (profile) =>
        `- ${escapeMarkdownText(profile.label)} — typical monthly bill $${profile.typicalBill}`,
    )
    .join('\n');

  const crews = city.crews
    .map(
      (crew) =>
        `- **${escapeMarkdownText(crew.name)}** — ${crew.installs} installs, ${crew.rating} rating, since ${crew.since}. ${escapeMarkdownText(crew.blurb)}`,
    )
    .join('\n');

  const testimonials = city.testimonials
    .map(
      (testimonial) =>
        `- “${escapeMarkdownText(testimonial.quote)}” — ${escapeMarkdownText(testimonial.author)}, ${escapeMarkdownText(testimonial.neighborhood)} (${escapeMarkdownText(testimonial.date)})`,
    )
    .join('\n');

  const faq = city.faq
    .map(
      (item) =>
        `### ${escapeMarkdownText(item.q)}\n${escapeMarkdownText(item.a)}`,
    )
    .join('\n\n');

  return `# ${title}

> ${escapeMarkdownText(FICTIONAL_PROJECT_NOTICE)}

## City identity

- City: ${cityName}, ${escapeMarkdownText(city.stateFull)} (${escapeMarkdownText(city.state)})
- Metro area: ${escapeMarkdownText(city.metroArea)}
- Popular neighborhoods: ${neighborhoods}
- Publication summary: ${escapeMarkdownText(cityDescription(city))}
- Interactive page: [${displayName}](${cityLink})

## Hero

${escapeMarkdownText(city.hero.description)}

## Process

_${escapeMarkdownText(city.process.eyebrow)}_

### ${escapeMarkdownText(city.process.title)}

${escapeMarkdownText(city.process.description)}

${processSteps}

## Simulator assumptions

These values are the visible assumptions used by the estimator. They are illustrative and are not a quote, financial advice, utility guidance, or tax advice.

- Utility assumption: ${escapeMarkdownText(city.utilityName)} at $${city.utilityRatePerKwh} per kWh
- Peak sun assumption: ${city.peakSunHoursPerDay} hours per day
- Panel assumption: ${city.panelWatts} watts per panel
- Performance ratio: ${city.performanceRatio} (${percentage.format(city.performanceRatio)})
- Installed cost assumption: $${city.costPerWattInstalled} per watt
- Minimum system size: ${city.minPanels} panels
- Federal credit assumption: ${city.federalCreditRate} (${percentage.format(city.federalCreditRate)}); this is not tax advice
- State incentive note: ${escapeMarkdownText(city.stateIncentiveNote)}

## Household profiles

${profiles}

## Fictional crew profiles

The following crew records are fictional challenge content, not endorsements or verified business accounts.

${crews}

## Fictional testimonials

The following testimonial text is fictional challenge content, not customer evidence or an endorsement.

${testimonials}

## Frequently asked questions

${faq}

## Next step

### ${escapeMarkdownText(city.finalCTA.title)}

${escapeMarkdownText(city.finalCTA.description)}

${city.contact.kind === 'display' ? 'Contact display: ' : ''}${escapeMarkdownText(city.contact.label)}

${escapeMarkdownText(FICTIONAL_PROJECT_NOTICE)}
`;
}
