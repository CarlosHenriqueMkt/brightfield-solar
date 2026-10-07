import type { CityConfig } from './city-config';

export const cityA = {
  slug: 'city-a',
  city: 'City A',
  state: 'XA',
  stateFull: 'Synthetic State A',
  metroArea: 'City A–Quartz–Juniper (synthetic metro)',
  utilityName: 'Quartz Demonstration Utility',
  utilityRatePerKwh: 0.2,
  peakSunHoursPerDay: 5,
  panelWatts: 400,
  performanceRatio: 0.75,
  costPerWattInstalled: 3,
  minPanels: 6,
  federalCreditRate: 0.25,
  stateIncentiveNote:
    'Synthetic State A incentives are illustrative only and excluded from the estimate.',
  installsCompleted: 246,
  crewsAvailable: 2,
  avgRating: 4.6,
  avgPermitDays: 14,
  designation: {
    kind: 'demo',
    label: 'Demo',
    notice:
      'Demo figures, utilities, incentives, testimonials, and crews are synthetic illustrations, not verified municipality or business claims.',
  },
  contact: {
    kind: 'unavailable',
    label: 'Contact details unavailable for this demonstration',
  },
  hero: {
    description:
      'Explore a fully synthetic City A estimate and see how each assumption changes the result.',
  },
  scenePoster: {
    desktopSrc: '/assets/posters/house-desktop.png',
    mobileSrc: '/assets/posters/house-mobile.png',
    alt: 'Illustrative City A home; roof fit needs an assessment',
  },
  process: {
    eyebrow: 'A synthetic example, clearly explained',
    title: 'A practical path from bill to panels',
    description:
      'This City A demonstration keeps the assumptions visible while showing the same straightforward solar process.',
    steps: [
      {
        title: 'Map your usage',
        copy: 'Begin with a monthly bill and a target coverage level. The example keeps both inputs visible so the estimate is easy to follow.',
        image: {
          src: '/assets/approved-v2/step-assess.png',
          alt: 'Illustration of reviewing a City A home energy assessment',
          decorative: false,
        },
      },
      {
        title: 'Design the array',
        copy: 'Translate that usage into a panel count, then review the illustrative utility and incentive assumptions before moving ahead.',
        image: {
          src: '/assets/approved-v2/step-plan.png',
          alt: 'Illustration of planning a City A solar array',
          decorative: false,
        },
      },
      {
        title: 'Complete the install',
        copy: 'The final step shows what an installation handoff could look like; the crew information here is synthetic demonstration content.',
        image: {
          src: '/assets/approved-v2/step-install.png',
          alt: 'Illustration of installing panels on a City A home',
          decorative: false,
        },
      },
    ],
  },
  socialProof: {
    testimonialEyebrow: 'Synthetic homeowner stories',
    testimonialTitle: 'Illustrative stories from City A neighborhoods',
    testimonialsLabel: 'City A demonstration testimonials',
    crewEyebrow: 'Synthetic installation teams',
    crewTitle: 'Meet the illustrative crews',
  },
  finalCTA: {
    title: 'Ready to explore the City A example?',
    description:
      'Run the demonstration estimate to see how bill, coverage, and local assumptions work together.',
    image: {
      src: '/assets/approved-v2/closing-home.png',
      alt: 'Illustrative City A home at dusk',
      decorative: false,
    },
  },
  popularNeighborhoods: [
    'Quartz Commons',
    'Juniper Terrace',
    'Copperfield North',
    'Sage Loop',
  ],
  householdProfiles: [
    {
      label: 'Compact courtyard home for one or two residents',
      typicalBill: 90,
    },
    {
      label: 'Three-bedroom Quartz Commons home with evening cooling',
      typicalBill: 220,
    },
    {
      label:
        'Long single-story Juniper Terrace home with workshop and heat pump',
      typicalBill: 340,
    },
    {
      label: 'Large multi-generational home with a shaded west-facing roof',
      typicalBill: 460,
    },
  ],
  crews: [
    {
      name: 'Quartz Field Team',
      installs: 98,
      rating: 4.7,
      since: 2022,
      blurb:
        'A synthetic two-person team focused on careful roof mapping and tidy conduit runs.',
      portrait: {
        src: '/assets/approved-v2/crew-ray.png',
        alt: 'Illustrative portrait for the Quartz Field Team',
        decorative: false,
      },
    },
    {
      name: 'Juniper Install Group',
      installs: 74,
      rating: 4.5,
      since: 2023,
      blurb:
        'A fictional crew that documents every step and explains the handoff in plain language.',
      portrait: {
        src: '/assets/approved-v2/crew-danielle.png',
        alt: 'Illustrative portrait for the Juniper Install Group',
        decorative: false,
      },
    },
  ],
  testimonials: [
    {
      quote:
        'The City A example made the panel count feel understandable because every input stayed on the page.',
      author: 'Nia T.',
      neighborhood: 'Quartz Commons',
      date: '2025-04-18',
    },
    {
      quote:
        'I could compare the bill and coverage assumptions without pretending the demonstration was a quote.',
      author: 'Owen L.',
      neighborhood: 'Juniper Terrace',
      date: '2025-05-09',
    },
    {
      quote:
        'The long Juniper Terrace profile helped me see why the estimate changes as our household uses more power.',
      author: 'Priya S.',
      neighborhood: 'Copperfield North',
      date: '2025-07-22',
    },
  ],
  faq: [
    {
      q: 'How many panels does the City A example use?',
      a: 'At a $220 monthly bill and 80% coverage, the synthetic City A assumptions produce 20 panels. This figure is illustrative, not a recommendation for a real home.',
    },
    {
      q: 'Which utility serves City A?',
      a: 'Quartz Demonstration Utility is a synthetic utility name used only by this demonstration. It is not a verified provider.',
    },
    {
      q: 'Is the City A incentive real?',
      a: 'No. Synthetic State A incentives are explicitly excluded from the estimate and should not be treated as a real program.',
    },
    {
      q: 'Can I call the City A crew?',
      a: 'No. The City A crews, testimonials, and contact status are synthetic illustration data and do not represent an operating business.',
    },
    {
      q: 'What changes the estimate most?',
      a: 'The monthly bill, coverage target, utility rate, sunlight, panel output, and installation cost all affect the illustrative result.',
    },
  ],
} as const satisfies CityConfig;
