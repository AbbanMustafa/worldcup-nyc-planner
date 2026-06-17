export type SpotKind = 'watch' | 'culture' | 'stadium' | 'final';

export type Spot = {
  id: string;
  name: string;
  kind: SpotKind;
  borough: string;
  neighborhood: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  countries: string[];
  accent: string;
  price: string;
  crowd: string;
  transit: string;
  nextWindow: string;
  headline: string;
  details: string;
  tips: string[];
  tags: string[];
};

export type MatchPick = {
  id: string;
  date: string;
  time: string;
  fixture: string;
  venue: string;
  neighborhoodMatch: string;
  reason: string;
  color: string;
};

export type PassportStop = {
  id: string;
  time: string;
  title: string;
  detail: string;
  spotId?: string;
};

export type MatchdayPassport = {
  id: string;
  country: string;
  title: string;
  fixture: string;
  hero: string;
  neighborhood: string;
  anchorSpotId: string;
  watchParty: string;
  cultureStop: string;
  foodPlan: string;
  transitPlan: string;
  budget: string;
  color: string;
  stops: PassportStop[];
};

export const spots: Spot[] = [
  {
    id: 'queens-hq',
    name: 'Queens Group Stage HQ',
    kind: 'watch',
    borough: 'Queens',
    neighborhood: 'Flushing Meadows',
    coordinates: { latitude: 40.7499, longitude: -73.847 },
    countries: ['Mexico', 'Korea Republic', 'South Africa', 'Czechia'],
    accent: '#FF385C',
    price: 'Free with event flow',
    crowd: 'Big-screen, high-energy',
    transit: '7 train to Mets-Willets Point',
    nextWindow: 'Group stage through Jun 27',
    headline: 'A major Queens base for daily screenings and performances.',
    details:
      'Anchor the day around the match, then walk toward Flushing for Korean, Chinese, and Mexican food options after the whistle.',
    tips: ['Arrive early for evening matches', 'Pair with Flushing food halls', 'Best for mixed groups'],
    tags: ['Official-style fan hub', 'Transit friendly', 'Food nearby']
  },
  {
    id: 'brooklyn-bridge',
    name: 'Brooklyn Fan Zone',
    kind: 'watch',
    borough: 'Brooklyn',
    neighborhood: 'Brooklyn Bridge Park',
    coordinates: { latitude: 40.7027, longitude: -73.9965 },
    countries: ['Brazil', 'Morocco', 'France', 'Senegal', 'Argentina'],
    accent: '#00A699',
    price: 'Free and ticketed moments',
    crowd: 'Waterfront festival',
    transit: 'A/C to High St or F to York St',
    nextWindow: 'Select dates through Jul 19',
    headline: 'Waterfront screens with skyline energy.',
    details:
      'Use the park as a meeting point before crossing into Dumbo, Cobble Hill, or Fort Greene for smaller bars and late food.',
    tips: ['Bring sun protection', 'Good for families before sunset', 'Expect bag checks'],
    tags: ['Skyline', 'Family friendly', 'Late food nearby']
  },
  {
    id: 'rockefeller',
    name: 'Telemundo Fan Village',
    kind: 'watch',
    borough: 'Manhattan',
    neighborhood: 'Rockefeller Center',
    coordinates: { latitude: 40.7587, longitude: -73.9787 },
    countries: ['Mexico', 'Argentina', 'Colombia', 'Uruguay', 'Spain'],
    accent: '#FC642D',
    price: 'Free plaza events',
    crowd: 'Broadcast plaza',
    transit: 'B/D/F/M to 47-50 Sts',
    nextWindow: 'Jul 6-Jul 19',
    headline: 'A Spanish-language broadcast hub in Midtown.',
    details:
      'Best for knockout-round energy, quick meetups, and visitors who want an easy subway transfer afterward.',
    tips: ['Check daily programming', 'Use it as a Midtown meetup', 'Great before dinner reservations'],
    tags: ['Spanish-language', 'Midtown', 'Knockout rounds']
  },
  {
    id: 'central-park',
    name: 'Central Park Final Lawn',
    kind: 'final',
    borough: 'Manhattan',
    neighborhood: 'Central Park',
    coordinates: { latitude: 40.7812, longitude: -73.9665 },
    countries: ['Finalists TBD'],
    accent: '#8B5CF6',
    price: 'Lottery or capacity managed',
    crowd: 'Massive final crowd',
    transit: 'B/C to 72 St or 1/2/3 to 72 St',
    nextWindow: 'Final - Jul 19',
    headline: 'The civic-scale final watch plan.',
    details:
      'Designed as the big culmination point. Keep a backup bar or neighborhood screen in mind because capacity rules can change.',
    tips: ['Enter lottery if required', 'Set a backup spot', 'Plan phone battery and water'],
    tags: ['Final', 'Lottery', 'Large crowd']
  },
  {
    id: 'times-square',
    name: 'Times Square Match Cube',
    kind: 'watch',
    borough: 'Manhattan',
    neighborhood: 'Times Square',
    coordinates: { latitude: 40.758, longitude: -73.9855 },
    countries: ['All teams'],
    accent: '#FFB400',
    price: 'Walk-up viewing atmosphere',
    crowd: 'Tourist-heavy spectacle',
    transit: '1/2/3/N/Q/R/W/S to Times Sq',
    nextWindow: 'All tournament',
    headline: 'A spectacle stop for the "only in New York" version of match day.',
    details:
      'Use this for quick photos, sponsor activations, and meeting out-of-town fans before heading to a more local venue.',
    tips: ['Keep it brief at peak times', 'Expect crowds', 'Good for visitors staying Midtown'],
    tags: ['Spectacle', 'Quick stop', 'Sponsor activations']
  },
  {
    id: 'jersey-hub',
    name: 'Jersey Fan Hub',
    kind: 'stadium',
    borough: 'New Jersey',
    neighborhood: 'Harrison',
    coordinates: { latitude: 40.7368, longitude: -74.1502 },
    countries: ['Brazil', 'Morocco', 'France', 'Senegal', 'England'],
    accent: '#0F766E',
    price: 'Event specific',
    crowd: 'Regional fan hub',
    transit: 'PATH to Harrison',
    nextWindow: 'Jun 13-Jul 15',
    headline: 'A PATH-friendly option for NY/NJ match days.',
    details:
      'Good for fans who want stadium-adjacent energy without going all the way into the Meadowlands.',
    tips: ['Check PATH service changes', 'Book return plan early', 'Works well before MetLife dates'],
    tags: ['PATH', 'Regional', 'Stadium energy']
  },
  {
    id: 'little-senegal',
    name: 'Little Senegal Walk',
    kind: 'culture',
    borough: 'Manhattan',
    neighborhood: 'Harlem',
    coordinates: { latitude: 40.803, longitude: -73.95 },
    countries: ['Senegal', 'France', 'Iraq', 'Norway'],
    accent: '#16A34A',
    price: 'Pay as you go',
    crowd: 'Neighborhood crawl',
    transit: '2/3 to 116 St or A/B/C/D to 125 St',
    nextWindow: 'Pair with Group I match days',
    headline: 'A culture-first route for Group I days.',
    details:
      'Start with Senegalese restaurants and markets around Harlem, then choose a nearby screen for France, Senegal, Iraq, or Norway fixtures.',
    tips: ['Make dinner the anchor', 'Ask venues about match audio', 'Good for early afternoon games'],
    tags: ['Food crawl', 'Group I', 'Neighborhood']
  },
  {
    id: 'jackson-heights',
    name: 'Jackson Heights Nations Loop',
    kind: 'culture',
    borough: 'Queens',
    neighborhood: 'Jackson Heights',
    coordinates: { latitude: 40.7465, longitude: -73.8914 },
    countries: ['Colombia', 'Ecuador', 'Argentina', 'Mexico'],
    accent: '#E11D48',
    price: 'Pay as you go',
    crowd: 'Street food and flags',
    transit: '7/E/F/M/R to Jackson Hts-Roosevelt Av',
    nextWindow: 'Great before evening matches',
    headline: 'A compact loop for Latin American match-day energy.',
    details:
      'Build a crawl around Colombian bakeries, Ecuadorian restaurants, Argentine bites, and Mexico-supporting bars.',
    tips: ['Use cash at smaller stops', 'Keep the group small', 'Best before 8 pm kickoffs'],
    tags: ['Latin America', 'Food crawl', '7 train']
  },
  {
    id: 'astoria',
    name: 'Astoria Mediterranean Run',
    kind: 'culture',
    borough: 'Queens',
    neighborhood: 'Astoria',
    coordinates: { latitude: 40.7644, longitude: -73.9235 },
    countries: ['Egypt', 'Morocco', 'Tunisia', 'Algeria', 'Spain'],
    accent: '#2563EB',
    price: 'Pay as you go',
    crowd: 'Cafe-to-bar crawl',
    transit: 'N/W to Broadway or 30 Av',
    nextWindow: 'Matchday 2 and knockouts',
    headline: 'North African, Middle Eastern, and Mediterranean food within a tight walk.',
    details:
      'Use Astoria for a slower cultural day: coffee, bakeries, dinner, then a local bar with audio if the match is big enough.',
    tips: ['Call ahead for audio', 'Easy group dinner area', 'Strong late-night food options'],
    tags: ['North Africa', 'Mediterranean', 'Late food']
  },
  {
    id: 'koreatown',
    name: 'Koreatown Red Devils Stop',
    kind: 'culture',
    borough: 'Manhattan',
    neighborhood: 'Koreatown',
    coordinates: { latitude: 40.7478, longitude: -73.9866 },
    countries: ['Korea Republic', 'Japan', 'Mexico'],
    accent: '#DC2626',
    price: 'Restaurant minimums vary',
    crowd: 'Dinner-first watch plan',
    transit: 'B/D/F/M/N/Q/R/W to Herald Sq',
    nextWindow: 'Korea Republic match days',
    headline: 'A natural base for Korea Republic fixtures and late-night food.',
    details:
      'Plan dinner before kickoff or reserve a room if your group wants guaranteed sound and seating.',
    tips: ['Reserve for big matches', 'Use Herald Square as the meet point', 'Best for smaller groups'],
    tags: ['Korea Republic', 'Dinner', 'Late night']
  },
  {
    id: 'sunset-park',
    name: 'Sunset Park Americas Trail',
    kind: 'culture',
    borough: 'Brooklyn',
    neighborhood: 'Sunset Park',
    coordinates: { latitude: 40.6455, longitude: -74.0124 },
    countries: ['Mexico', 'Colombia', 'Ecuador', 'Paraguay'],
    accent: '#F97316',
    price: 'Pay as you go',
    crowd: 'Neighborhood flags',
    transit: 'D/N/R to 36 St or 45 St',
    nextWindow: 'Group C and D days',
    headline: 'A Brooklyn route for Americas fixtures.',
    details:
      'Use Fifth Avenue for food and casual match watching, especially when Mexico, Colombia, Ecuador, or Paraguay play.',
    tips: ['Walk Fifth Avenue', 'Keep an eye on outdoor screens', 'Great for afternoon starts'],
    tags: ['Americas', 'Brooklyn', 'Casual']
  },
  {
    id: 'fort-greene',
    name: 'Fort Greene Pub Cluster',
    kind: 'watch',
    borough: 'Brooklyn',
    neighborhood: 'Fort Greene',
    coordinates: { latitude: 40.6895, longitude: -73.9724 },
    countries: ['England', 'Ghana', 'Croatia', 'France'],
    accent: '#111827',
    price: 'Bar minimums vary',
    crowd: 'Pub energy',
    transit: 'G to Fulton or C to Lafayette Av',
    nextWindow: 'Group L and knockout days',
    headline: 'A quieter Brooklyn alternative to the biggest fan zones.',
    details:
      'Use Fort Greene when your group wants pub energy, easier food choices, and a short ride from Barclays Center.',
    tips: ['Call for reservations', 'Check audio by fixture', 'Good fallback for capacity limits'],
    tags: ['Pubs', 'Fallback', 'Brooklyn']
  }
];

export const matchdayPassports: MatchdayPassport[] = [
  {
    id: 'argentina-passport',
    country: 'Argentina',
    title: 'Argentina Matchday Passport',
    fixture: 'Argentina group-stage night',
    hero:
      'Start with empanadas in Jackson Heights, catch the match with sky-blue flags, then keep the night moving on the 7.',
    neighborhood: 'Jackson Heights, Queens',
    anchorSpotId: 'jackson-heights',
    watchParty: 'Queens football bar near Roosevelt Av',
    cultureStop: 'Argentine bakery and Latin American street food loop',
    foodPlan: 'Empanadas, steak sandwich, late helado stop',
    transitPlan: '7/E/F/M/R to Jackson Hts-Roosevelt Av',
    budget: '$25-$55 before drinks',
    color: '#75AADB',
    stops: [
      {
        id: 'fuel',
        time: '3:30 PM',
        title: 'Fuel up',
        detail: 'Start with an Argentine bakery, then add Colombian or Ecuadorian bites around 37th Ave.',
        spotId: 'jackson-heights'
      },
      {
        id: 'watch',
        time: '5:00 PM',
        title: 'Watch party',
        detail: 'Walk to a Queens football bar showing Argentina with match audio and a flag-heavy crowd.',
        spotId: 'jackson-heights'
      },
      {
        id: 'after',
        time: 'Post-match',
        title: 'Flags and dessert',
        detail: 'Stay local for sidewalk celebrations, helado, and a quick 7 train exit.'
      }
    ]
  },
  {
    id: 'korea-passport',
    country: 'Korea Republic',
    title: 'Korea Republic Night Plan',
    fixture: 'Korea Republic match day',
    hero: 'Make dinner the anchor, reserve early, and use Koreatown as the tightest late-night plan.',
    neighborhood: 'Koreatown, Manhattan',
    anchorSpotId: 'koreatown',
    watchParty: 'Koreatown room with match audio',
    cultureStop: 'Korean barbecue, bakeries, and late-night karaoke blocks',
    foodPlan: 'BBQ table, fried chicken, shaved ice',
    transitPlan: 'B/D/F/M/N/Q/R/W to Herald Sq',
    budget: '$35-$80 depending on group size',
    color: '#DC2626',
    stops: [
      {
        id: 'meet',
        time: '6:00 PM',
        title: 'Meet at Herald Square',
        detail: 'Keep the meetup simple, then walk into the dining blocks together.',
        spotId: 'koreatown'
      },
      {
        id: 'dinner',
        time: '6:30 PM',
        title: 'Dinner-first table',
        detail: 'Reserve a room or table before kickoff so your group has seats and sound.'
      },
      {
        id: 'late',
        time: 'After final whistle',
        title: 'Late-night second stop',
        detail: 'Use bakeries, dessert, or karaoke as the post-match fallback.'
      }
    ]
  },
  {
    id: 'japan-passport',
    country: 'Japan',
    title: 'Japan Matchday Passport',
    fixture: 'Japan supporter night',
    hero: 'Anchor the night in Koreatown with izakaya energy, ramen, and a late dessert route before kickoff.',
    neighborhood: 'Koreatown, Manhattan',
    anchorSpotId: 'koreatown',
    watchParty: 'Koreatown izakaya or soccer bar with Japan supporters',
    cultureStop: 'Japanese restaurants, bakeries, and late-night dessert around Herald Square',
    foodPlan: 'Ramen, yakitori, konbini-style snacks, late dessert',
    transitPlan: 'B/D/F/M/N/Q/R/W to Herald Sq',
    budget: '$30-$75 depending on table size',
    color: '#BC002D',
    stops: [
      {
        id: 'meet',
        time: '5:30 PM',
        title: 'Meet near Herald Square',
        detail: 'Keep the group close to the B/D/F/M/N/Q/R/W hub before walking into Koreatown.',
        spotId: 'koreatown'
      },
      {
        id: 'eat',
        time: '6:00 PM',
        title: 'Izakaya or ramen base',
        detail: 'Start with ramen, yakitori, or shareable izakaya plates before kickoff.',
        spotId: 'koreatown'
      },
      {
        id: 'watch',
        time: 'Kickoff',
        title: 'Japan supporter screen',
        detail: 'Choose a soccer bar or private room with Japan supporters, match audio, and room for flags.'
      },
      {
        id: 'late',
        time: 'Post-match',
        title: 'Late dessert',
        detail: 'Keep the plan flexible with shaved ice, bakeries, or konbini-style snacks nearby.'
      }
    ]
  },
  {
    id: 'senegal-passport',
    country: 'Senegal',
    title: 'Senegal Harlem Walk',
    fixture: 'Senegal evening fixture',
    hero: 'Build the plan around Harlem food, markets, and a nearby screen before the match starts.',
    neighborhood: 'Little Senegal, Harlem',
    anchorSpotId: 'little-senegal',
    watchParty: 'Harlem screen near the restaurant crawl',
    cultureStop: 'Senegalese restaurants and markets around 116th and 125th',
    foodPlan: 'Thieboudienne, grilled fish, ginger drink',
    transitPlan: '2/3 to 116 St or A/B/C/D to 125 St',
    budget: '$20-$45 pay as you go',
    color: '#16A34A',
    stops: [
      {
        id: 'crawl',
        time: '4:00 PM',
        title: 'Food crawl',
        detail: 'Start with Senegalese restaurants and markets before the crowd builds.',
        spotId: 'little-senegal'
      },
      {
        id: 'audio',
        time: '6:30 PM',
        title: 'Find match audio',
        detail: 'Ask venues about sound before committing the group to a screen.'
      },
      {
        id: 'walk',
        time: 'After match',
        title: 'Harlem walkout',
        detail: 'Keep the post-match route close to 125th for trains and backup food.'
      }
    ]
  }
];

export const matchPicks: MatchPick[] = [
  {
    id: 'mex-kor',
    date: 'Jun 18',
    time: 'Evening ET',
    fixture: 'Mexico vs Korea Republic',
    venue: 'Guadalajara',
    neighborhoodMatch: 'Queens HQ or Koreatown',
    reason: 'Two fan bases with strong NYC food routes.',
    color: '#FF385C'
  },
  {
    id: 'usa-aus',
    date: 'Jun 19',
    time: 'Prime ET',
    fixture: 'USA vs Australia',
    venue: 'Seattle',
    neighborhoodMatch: 'Brooklyn Fan Zone',
    reason: 'Easy broad appeal for mixed groups.',
    color: '#2563EB'
  },
  {
    id: 'nor-sen',
    date: 'Jun 22',
    time: '8:00 PM ET',
    fixture: 'Norway vs Senegal',
    venue: 'New York New Jersey Stadium',
    neighborhoodMatch: 'Little Senegal Walk',
    reason: 'Best local culture pairing with a nearby host-region match.',
    color: '#16A34A'
  },
  {
    id: 'ecu-ger',
    date: 'Jun 25',
    time: '4:00 PM ET',
    fixture: 'Ecuador vs Germany',
    venue: 'New York New Jersey Stadium',
    neighborhoodMatch: 'Jackson Heights Nations Loop',
    reason: 'Start in Queens, then continue to a screen or stadium commute.',
    color: '#E11D48'
  },
  {
    id: 'eng-pan',
    date: 'Jun 27',
    time: '5:00 PM ET',
    fixture: 'Panama vs England',
    venue: 'New York New Jersey Stadium',
    neighborhoodMatch: 'Fort Greene Pub Cluster',
    reason: 'A strong pub-day fixture with Brooklyn fallback options.',
    color: '#111827'
  },
  {
    id: 'final',
    date: 'Jul 19',
    time: '3:00 PM ET',
    fixture: 'World Cup Final',
    venue: 'New York New Jersey Stadium',
    neighborhoodMatch: 'Central Park Final Lawn',
    reason: 'Plan early around capacity, transit, and a backup venue.',
    color: '#8B5CF6'
  }
];

export const filters = [
  { id: 'all', label: 'All' },
  { id: 'watch', label: 'Watch' },
  { id: 'culture', label: 'Culture' },
  { id: 'stadium', label: 'Stadium' },
  { id: 'final', label: 'Final' }
] as const;

export type FilterId = (typeof filters)[number]['id'];
