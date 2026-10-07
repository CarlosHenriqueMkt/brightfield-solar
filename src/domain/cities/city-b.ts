import type { CityConfig } from './city-config';

export const cityB = {
  slug: 'city-b',
  city: 'City B',
  state: 'XB',
  stateFull: 'Synthetic State B',
  metroArea: 'City B–Cedar–Harbor (synthetic metro)',
  utilityName: 'Cedar Demonstration Grid',
  utilityRatePerKwh: 0.1,
  peakSunHoursPerDay: 4,
  panelWatts: 500,
  performanceRatio: 0.8,
  costPerWattInstalled: 2.4,
  minPanels: 10,
  federalCreditRate: 0.2,
  stateIncentiveNote:
    'Synthetic State B incentive examples are illustrative only and excluded from the estimate.',
  installsCompleted: 418,
  crewsAvailable: 4,
  avgRating: 4.4,
  avgPermitDays: 28,
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
      'Use the synthetic City B scenario to see how a different utility rate and roof profile change the math.',
  },
  scenePoster: {
    desktopSrc: '/assets/posters/house-desktop.png',
    mobileSrc: '/assets/posters/house-mobile.png',
    alt: 'Illustrative City B home beneath a clear afternoon sky',
  },
  process: {
    eyebrow: 'A synthetic scenario, step by step',
    title: 'Make the solar math visible',
    description:
      'City B uses its own assumptions and copy so this synthetic scenario can be explored on its own terms.',
    steps: [
      {
        title: 'Start with the bill',
        copy: 'Choose a household profile or enter a bill directly. The demonstration makes the starting point explicit before estimating panel output.',
        image: {
          src: '/assets/approved-v2/step-plan.png',
          alt: 'Illustration of a City B energy planning worksheet',
          decorative: false,
        },
      },
      {
        title: 'Test the assumptions',
        copy: 'Change coverage and compare the illustrative Cedar grid rate, sunlight, panel size, and installation cost.',
        image: {
          src: '/assets/approved-v2/step-assess.png',
          alt: 'Illustration of comparing City B solar assumptions',
          decorative: false,
        },
      },
      {
        title: 'Review the handoff',
        copy: 'The fictional crews show how a finished installation story can be presented while remaining clearly separate from real claims.',
        image: {
          src: '/assets/approved-v2/step-install.png',
          alt: 'Illustration of a completed City B panel installation',
          decorative: false,
        },
      },
    ],
  },
  socialProof: {
    testimonialEyebrow: 'Synthetic stories from City B',
    testimonialTitle: 'Explore an illustrative coastal-grid scenario',
    testimonialsLabel: 'City B demonstration testimonials',
    crewEyebrow: 'Illustrative field teams',
    crewTitle: 'Four fictional crews, one clear example',
  },
  finalCTA: {
    title: 'Try the City B numbers',
    description:
      'Open the estimator to compare a different rate, panel size, and coverage target in this synthetic scenario.',
    image: {
      src: '/assets/approved-v2/closing-home.png',
      alt: 'Illustrative City B home at blue hour; roof fit needs an assessment',
      decorative: false,
    },
  },
  popularNeighborhoods: [
    'Cedar Landing',
    'Harbor View',
    'Blue Heron Point',
    'North Breakwater',
    'Tideglass Row',
  ],
  householdProfiles: [
    {
      label: 'Harbor View cottage with a compact evening load',
      typicalBill: 90,
    },
    {
      label: 'Cedar Landing home with electric heating',
      typicalBill: 220,
    },
    {
      label:
        'Blue Heron Point house with a workshop and a battery-ready garage',
      typicalBill: 350,
    },
    {
      label:
        'North Breakwater multi-level home with two work-from-home offices',
      typicalBill: 500,
    },
  ],
  crews: [
    {
      name: 'Harbor Line Crew',
      installs: 121,
      rating: 4.4,
      since: 2020,
      blurb:
        'A fictional team known for careful flashing checks on the windy side of the harbor.',
      portrait: {
        src: '/assets/approved-v2/crew-okafor.png',
        alt: 'Illustrative portrait for the Harbor Line Crew',
        decorative: false,
      },
    },
    {
      name: 'Cedar Ridge Team',
      installs: 109,
      rating: 4.6,
      since: 2021,
      blurb:
        'A synthetic crew that keeps a precise installation log for every demonstration home.',
      portrait: {
        src: '/assets/approved-v2/crew-ray.png',
        alt: 'Illustrative portrait for the Cedar Ridge Team',
        decorative: false,
      },
    },
    {
      name: 'Breakwater Installers',
      installs: 86,
      rating: 4.3,
      since: 2022,
      blurb:
        'A fictional group focused on panel spacing, roof access, and a tidy final walkthrough.',
      portrait: {
        src: '/assets/approved-v2/crew-danielle.png',
        alt: 'Illustrative portrait for the Breakwater Installers',
        decorative: false,
      },
    },
    {
      name: 'Tideglass Crew',
      installs: 72,
      rating: 4.5,
      since: 2023,
      blurb:
        'A synthetic four-person crew that explains each handoff without promising real service.',
      portrait: {
        src: '/assets/approved-v2/crew-okafor.png',
        alt: 'Illustrative portrait for the Tideglass Crew',
        decorative: false,
      },
    },
  ],
  testimonials: [
    {
      quote:
        'City B was useful because the lower illustrative utility rate made the tradeoffs easy to compare.',
      author: 'Elena V.',
      neighborhood: 'Cedar Landing',
      date: '2025-03-14',
    },
    {
      quote:
        'The Harbor View example kept the synthetic notice close to the numbers, which made the story feel honest.',
      author: 'Marcus J.',
      neighborhood: 'Harbor View',
      date: '2025-06-02',
    },
    {
      quote:
        'The North Breakwater example made the estimated panel count easier to compare with our household bill.',
      author: 'Talia K.',
      neighborhood: 'North Breakwater',
      date: '2025-08-26',
    },
  ],
  faq: [
    {
      q: 'How many panels does the City B example use?',
      a: 'At a $220 monthly bill and 80% coverage, the synthetic City B assumptions produce 37 panels. This is demonstration data, not a real recommendation.',
    },
    {
      q: 'What assumptions shape the City B panel count?',
      a: 'The synthetic City B count reflects this scenario’s $0.10 utility rate, four peak sun hours, 500-watt panels, and 80% coverage target. It is illustrative, not a real recommendation.',
    },
    {
      q: 'Is Cedar Demonstration Grid a real provider?',
      a: 'No. The utility name, figures, and incentive examples are synthetic illustrations and not verified claims about a municipality or business.',
    },
    {
      q: 'Why are there four crews?',
      a: 'Four explicit fictional crews exercise the data shape used by the social proof section. Their portraits and stories are not real business claims.',
    },
    {
      q: 'Can I use this estimate for a City B installation?',
      a: 'No. City B is a synthetic scenario intended to explain the estimator, not to provide a quote, utility guidance, or installation service.',
    },
  ],
} as const satisfies CityConfig;
