export type EggType = 'Chicken' | 'Quail' | 'Duck';
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
}

export interface MarketplaceListingDraft {
  id: string;
  title: string;
  location: string;
  quantity: number;
  price: string;
  status: 'Draft' | 'Live' | 'Ready to publish';
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
  },
];

export const reminders = [
  'Turn Batch 1 eggs at 18:00',
  'Lockdown starts for Duck Lockdown in 24 hours',
  'No humidity log recorded yet for today',
];

export const marketplaceDrafts: MarketplaceListingDraft[] = [
  {
    id: 'listing-1',
    title: 'Day-old Boschveld chicks',
    location: 'Harare',
    quantity: 18,
    price: '$1.20 each',
    status: 'Ready to publish',
  },
  {
    id: 'listing-2',
    title: 'Fertile village chicken eggs',
    location: 'Marondera',
    quantity: 36,
    price: '$0.45 each',
    status: 'Draft',
  },
];

export const setupChecklist = [
  'Clean and dry incubator before use',
  'Run empty for 24 hours to stabilize temperature',
  'Confirm thermometer and hygrometer readings',
  'Load eggs only after humidity and heat stay steady',
];
