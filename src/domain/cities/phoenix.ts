import type { CityConfig } from './city-config';

export const phoenix = {
  slug: 'phoenix-az',
  city: 'Phoenix',
  state: 'AZ',
  stateFull: 'Arizona',
  metroArea: 'Phoenix–Mesa–Chandler',
  utilityName: 'Arizona Public Service',
  utilityRatePerKwh: 0.15,
  peakSunHoursPerDay: 6.5,
  panelWatts: 450,
  performanceRatio: 0.8,
  costPerWattInstalled: 2.75,
  minPanels: 8,
  federalCreditRate: 0.3,
  stateIncentiveNote:
    'Arizona adds a state tax credit worth 25% of the system cost, capped at $1,000. It is not included in the estimate below.',
  installsCompleted: 1840,
  crewsAvailable: 12,
  avgRating: 4.8,
  avgPermitDays: 21,
  phone: '(602) 555-0147',
  popularNeighborhoods: [
    'Arcadia',
    'Ahwatukee',
    'Desert Ridge',
    'Encanto',
    'Laveen',
  ],
  householdProfiles: [
    {
      label: 'Apartment or small condo, 1–2 people',
      typicalBill: 90,
    },
    {
      label: 'Three-bedroom house, no pool',
      typicalBill: 220,
    },
    {
      label: 'Four-bedroom house with central AC',
      typicalBill: 310,
    },
    {
      label: 'House with a pool and an EV in the garage',
      typicalBill: 430,
    },
  ],
  crews: [
    {
      name: 'Ray O. and team',
      installs: 412,
      rating: 4.9,
      since: 2019,
      blurb:
        'Tile roofs are their specialty. They mount without cracking a single tile and photograph every penetration.',
    },
    {
      name: 'Danielle W. and team',
      installs: 287,
      rating: 5,
      since: 2021,
      blurb:
        'Handles the permit paperwork with the city herself, which is why her jobs clear inspection first time.',
    },
    {
      name: 'The Okafor brothers',
      installs: 533,
      rating: 4.8,
      since: 2018,
      blurb:
        'Fastest crew on flat roofs. A standard twenty-panel system goes up in a single day.',
    },
  ],
  testimonials: [
    {
      quote:
        'My summer bill used to hit $380 in July. The first summer after the install it was $61. The crew was on my roof for one day and I barely knew they were there.',
      author: 'Marta R.',
      neighborhood: 'Ahwatukee',
      date: '2025-08-11',
    },
    {
      quote:
        'I got three quotes. Brightfield was the only one that showed me the math instead of just a monthly payment, so I could tell what I was actually buying.',
      author: 'Kevin D.',
      neighborhood: 'Arcadia',
      date: '2025-06-27',
    },
    {
      quote:
        'Permit took about three weeks, which they told me upfront. No surprises, no change orders, and the final invoice matched the quote to the dollar.',
      author: 'Sandra P.',
      neighborhood: 'Desert Ridge',
      date: '2025-09-04',
    },
  ],
  faq: [
    {
      q: 'How many solar panels does a house in Phoenix need?',
      a: 'It depends on your bill. A three-bedroom home in Phoenix with a $220 monthly bill needs about 17 panels to cover 80% of its usage. Phoenix gets 6.5 peak sun hours a day, among the best in the country, so homes here need fewer panels than the same house in a cloudier state.',
    },
    {
      q: 'How much does a solar system cost in Phoenix?',
      a: 'We install at $2.75 per watt. A 17-panel system runs $21,038 before incentives and $14,726 after the 30% federal tax credit. Arizona adds a state credit of 25% capped at $1,000 on top of that.',
    },
    {
      q: 'How long until the system pays for itself?',
      a: 'Most Phoenix homes reach payback in about seven years. Smaller homes take longer, because every installation has a minimum size and a small household ends up with more panels than it strictly needs.',
    },
    {
      q: 'What happens to the power I generate but do not use?',
      a: 'It goes back to the grid and Arizona Public Service credits it against future bills. Those credits roll forward, but they never turn into a payment, so your savings stop at the size of your bill.',
    },
    {
      q: 'How long does the whole process take?',
      a: 'The city permit averages 21 days in Phoenix. Installation itself is usually one day, and utility interconnection adds a week or two after that.',
    },
    {
      q: 'What happens if I sell the house?',
      a: 'An owned system transfers with the property and appraisers in Maricopa County generally treat it as added value. There is no lease to assign and nothing for the buyer to qualify for.',
    },
  ],
} as const satisfies CityConfig;
