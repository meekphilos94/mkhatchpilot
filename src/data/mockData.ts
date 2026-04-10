export type EggType =
  | 'Chicken'
  | 'Quail'
  | 'Duck'
  | 'Turkey'
  | 'Goose'
  | 'Guinea Fowl'
  | 'Pigeon'
  | 'Peafowl';
export type BatchStage = 'Setup' | 'Incubating' | 'Lockdown' | 'Hatching';

export interface HatchBatch {
  id: string;
  name: string;
  eggType: EggType;
  incubatorName: string;
  quantity: number;
  fertileCount: number;
  currentDay: number;
  totalDays: number;
  targetTemp: string;
  targetHumidity: string;
  nextTask: string;
  stage: BatchStage;
  startDate?: string;
  expectedHatchDate?: string;
  hatchedCount?: number;
  weakCount?: number;
  unhatchedCount?: number;
  hatchNotes?: string;
  completedAt?: string;
}

export interface MarketplaceListingDraft {
  id: string;
  title: string;
  category: 'chicks' | 'fertile-eggs' | 'birds' | 'equipment';
  location: string;
  quantity: number;
  price: string;
  status: 'Draft' | 'Live' | 'Sold';
  imageUrl?: string;
  description?: string;
  availableFrom?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerFarmName?: string;
  sellerVerificationStatus?: 'unverified' | 'pending' | 'verified';
  contactPreference?: 'phone' | 'in-app';
  deliveryOption?: 'pickup' | 'delivery' | 'either';
  commissionRate?: number;
  grossRevenue?: number;
  sellerNetAmount?: number;
}

export interface IncubatorGuide {
  id: string;
  name: string;
  capacityLabel: string;
  bestFor: string;
  waterGuide: string;
  powerGuide: string;
  setupSteps: string[];
  preheatHours?: string;
  roomPlacement?: string;
  starterAccessories?: string[];
  warningTips?: string[];
}

export interface EggKnowledgeGuide {
  eggType: EggType;
  totalDays: number;
  temperature: string;
  humidity: string;
  lockdownDay: string;
  turning: string;
  careTip: string;
}

export interface DashboardReminder {
  id: string;
  message: string;
}

export const activeBatch: HatchBatch = {
  id: 'batch-001',
  name: 'April Village Hatch',
  eggType: 'Chicken',
  incubatorName: 'Meeky 64 Egg Smart Incubator',
  quantity: 48,
  fertileCount: 42,
  currentDay: 12,
  totalDays: 21,
  targetTemp: '37.5 C',
  targetHumidity: '45-55%',
  nextTask: 'Candle the eggs this evening and remove any clears.',
  stage: 'Incubating',
  startDate: '2026-04-01',
  expectedHatchDate: '2026-04-22T08:00:00.000Z',
  hatchedCount: 0,
  weakCount: 0,
  unhatchedCount: 0,
};

export const batches: HatchBatch[] = [
  activeBatch,
  {
    id: 'batch-002',
    name: 'Quail Trial Batch',
    eggType: 'Quail',
    incubatorName: 'Meeky 32 Egg Compact',
    quantity: 30,
    fertileCount: 26,
    currentDay: 5,
    totalDays: 18,
    targetTemp: '37.6 C',
    targetHumidity: '45-50%',
    nextTask: 'Turn eggs before 8pm and top up water channel B.',
    stage: 'Incubating',
    startDate: '2026-04-04',
    expectedHatchDate: '2026-04-22T08:00:00.000Z',
  },
  {
    id: 'batch-003',
    name: 'Duck Lockdown',
    eggType: 'Duck',
    incubatorName: 'Meeky 96 Egg Pro',
    quantity: 24,
    fertileCount: 20,
    currentDay: 25,
    totalDays: 28,
    targetTemp: '37.2 C',
    targetHumidity: '65-70%',
    nextTask: 'Stop turning and increase humidity for lockdown.',
    stage: 'Lockdown',
    startDate: '2026-03-15',
    expectedHatchDate: '2026-04-12T08:00:00.000Z',
  },
];

export const reminders: DashboardReminder[] = [
  { id: 'reminder-1', message: 'Turn Batch 1 eggs at 18:00' },
  { id: 'reminder-2', message: 'Lockdown starts for Duck Lockdown in 24 hours' },
  { id: 'reminder-3', message: 'No humidity log recorded yet for today' },
];

export const marketplaceDrafts: MarketplaceListingDraft[] = [
  {
    id: 'listing-1',
    title: 'Day-old Boschveld chicks',
    category: 'chicks',
    location: 'Harare',
    quantity: 18,
    price: '$1.20 each',
    status: 'Live',
    description: 'Strong day-old Boschveld chicks from a clean monitored hatch.',
    availableFrom: '2026-04-09T08:00:00.000Z',
    sellerName: 'MK Hatch Pilot Farmer',
    sellerPhone: '+263771234567',
    sellerFarmName: 'Meeky Starter Farm',
    sellerVerificationStatus: 'verified',
    contactPreference: 'phone',
    deliveryOption: 'pickup',
    commissionRate: 0.05,
    grossRevenue: 21.6,
    sellerNetAmount: 20.52,
  },
  {
    id: 'listing-2',
    title: 'Fertile village chicken eggs',
    category: 'fertile-eggs',
    location: 'Marondera',
    quantity: 36,
    price: '$0.45 each',
    status: 'Draft',
    description: 'Collected from healthy village hens and ready for incubation.',
    availableFrom: '2026-04-10T08:00:00.000Z',
    sellerName: 'MK Hatch Pilot Farmer',
    sellerPhone: '+263771234567',
    sellerFarmName: 'Meeky Starter Farm',
    sellerVerificationStatus: 'pending',
    contactPreference: 'in-app',
    deliveryOption: 'either',
    commissionRate: 0.05,
    grossRevenue: 16.2,
    sellerNetAmount: 15.39,
  },
  {
    id: 'listing-3',
    title: 'Kuroiler starter chicks',
    category: 'chicks',
    location: 'Bulawayo',
    quantity: 25,
    price: '$1.35 each',
    status: 'Live',
    description: 'Healthy starter chicks from a verified hatch with strong brooding guidance available.',
    availableFrom: '2026-04-11T08:00:00.000Z',
    sellerName: 'Nomsa Dube',
    sellerPhone: '+263772998877',
    sellerFarmName: 'Green Valley Hatchery',
    sellerVerificationStatus: 'verified',
    contactPreference: 'phone',
    deliveryOption: 'either',
    commissionRate: 0.05,
    grossRevenue: 33.75,
    sellerNetAmount: 32.06,
  },
];

export const setupChecklist = [
  'Clean and dry incubator before use',
  'Run empty for 24 hours to stabilize temperature',
  'Confirm thermometer and hygrometer readings',
  'Load eggs only after humidity and heat stay steady',
];

export const incubatorGuides: IncubatorGuide[] = [
  {
    id: 'meeky-32-compact',
    name: 'Meeky 32 Egg Compact',
    capacityLabel: '32 eggs',
    bestFor: 'Small starter hatches and quail batches',
    waterGuide: 'Fill channel A lightly on setup day and top up in small amounts to avoid humidity spikes.',
    powerGuide: 'Best used on a stable indoor socket or small backup power pack during outages.',
    preheatHours: '12 to 24 hours',
    roomPlacement: 'Keep it in a quiet room away from windows, kitchens, and door drafts.',
    starterAccessories: ['Small backup power pack', 'Mini hygrometer', 'Egg candler'],
    warningTips: ['Do not overfill the water channel early.', 'Avoid stacking too many small eggs tightly.'],
    setupSteps: [
      'Clean trays, shell guard, and water channels before the first run.',
      'Run empty for 12 to 24 hours and confirm the fan is circulating warm air evenly.',
      'Place the incubator away from windows and direct sun to reduce temperature swings.',
      'Load eggs only after temperature and humidity hold steady for several hours.',
    ],
  },
  {
    id: 'meeky-64-smart',
    name: 'Meeky 64 Egg Smart Incubator',
    capacityLabel: '64 eggs',
    bestFor: 'Village chicken, Boschveld, and mixed household hatches',
    waterGuide: 'Start with one water channel, then increase during lockdown as humidity needs rise.',
    powerGuide: 'Pair with a small inverter or backup battery if your area has frequent load shedding.',
    preheatHours: 'Overnight test run',
    roomPlacement: 'Best on a level table with at least one hand of space around the air vents.',
    starterAccessories: ['Backup inverter', 'Independent thermometer', 'Cleaning kit'],
    warningTips: ['Test the turner before eggs go in.', 'Do not move the machine once incubation starts.'],
    setupSteps: [
      'Wipe down the incubator body and confirm the turner motor is seated correctly.',
      'Do a full empty test run overnight with a separate thermometer inside the machine.',
      'Check that egg turning works before loading any eggs.',
      'Label your batch and set a candling day reminder before incubation starts.',
    ],
  },
  {
    id: 'meeky-96-pro',
    name: 'Meeky 96 Egg Pro',
    capacityLabel: '96 eggs',
    bestFor: 'Larger farmer batches and multi-family hatch businesses',
    waterGuide: 'Use both water channels carefully and monitor humidity with a separate hygrometer for accuracy.',
    powerGuide: 'Strongly recommended to have backup power because a full machine represents a larger financial risk.',
    preheatHours: '24-hour cabinet stabilization',
    roomPlacement: 'Place on a strong level stand in a room with steady temperature and low traffic.',
    starterAccessories: ['Large inverter', 'Spare fan fuse', 'Second hygrometer', 'Sanitizing spray'],
    warningTips: ['Large cabinets recover slowly after opening.', 'Plan power backup before loading premium eggs.'],
    setupSteps: [
      'Level the incubator so water channels and egg turning stay consistent across the tray.',
      'Test the fan, heater, and rotation system under load before placing premium eggs inside.',
      'Plan airflow and room temperature because large cabinets react slower to sudden changes.',
      'Create your batch record and setup checklist in the app before eggs are loaded.',
    ],
  },
];

export const eggKnowledgeGuides: EggKnowledgeGuide[] = [
  {
    eggType: 'Chicken',
    totalDays: 21,
    temperature: '37.5 C',
    humidity: '45-55%, then 65-70% in lockdown',
    lockdownDay: 'Day 18',
    turning: 'At least 3 to 5 times daily until lockdown',
    careTip: 'Avoid opening the incubator too often in the final three days because humidity drops quickly.',
  },
  {
    eggType: 'Quail',
    totalDays: 18,
    temperature: '37.6 C',
    humidity: '45-50%, then slightly higher in lockdown',
    lockdownDay: 'Day 15',
    turning: 'Multiple gentle turns daily until lockdown',
    careTip: 'Quail eggs hatch quickly, so keep a close eye on timing and avoid rough handling during candling.',
  },
  {
    eggType: 'Duck',
    totalDays: 28,
    temperature: '37.2 C',
    humidity: '55-60%, then 65-70% in lockdown',
    lockdownDay: 'Day 25',
    turning: 'Turn consistently every day until lockdown',
    careTip: 'Duck eggs often need slightly higher humidity and can suffer if moisture stays too low for long periods.',
  },
  {
    eggType: 'Turkey',
    totalDays: 28,
    temperature: '37.5 C',
    humidity: '50-55%',
    lockdownDay: 'Day 25',
    turning: 'Turn daily until the final three days',
    careTip: 'Turkeys reward stable conditions, so avoid moving the incubator once the batch has started.',
  },
  {
    eggType: 'Goose',
    totalDays: 30,
    temperature: '37.2 C',
    humidity: '55-65%',
    lockdownDay: 'Day 27',
    turning: 'Steady daily turning until lockdown',
    careTip: 'Goose eggs are large and valuable, so a backup power plan matters much more here.',
  },
  {
    eggType: 'Guinea Fowl',
    totalDays: 26,
    temperature: '37.5 C',
    humidity: '45-50%',
    lockdownDay: 'Day 23',
    turning: 'Frequent daily turns until lockdown',
    careTip: 'Guinea eggs can look slower than chicken eggs early on, so candle with patience before removing them.',
  },
  {
    eggType: 'Pigeon',
    totalDays: 18,
    temperature: '37.5 C',
    humidity: '50-55%',
    lockdownDay: 'Day 15',
    turning: 'Gentle regular turns until lockdown',
    careTip: 'Pigeon batches are usually smaller, so one mistake affects more of your expected result.',
  },
  {
    eggType: 'Peafowl',
    totalDays: 28,
    temperature: '37.5 C',
    humidity: '50-55%',
    lockdownDay: 'Day 25',
    turning: 'Daily turning until lockdown',
    careTip: 'Peafowl eggs benefit from careful record-keeping because hatch timing can feel less predictable than chickens.',
  },
];
