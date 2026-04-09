export type AppUserRole = 'farmer' | 'buyer' | 'admin';
export type BatchStatus = 'setup' | 'active' | 'lockdown' | 'hatched' | 'archived';
export type ListingStatus = 'draft' | 'live' | 'sold';

export interface AppUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  location: string;
  roles: AppUserRole[];
  incubatorIds: string[];
  createdAt: string;
}

export interface Incubator {
  id: string;
  ownerId: string;
  modelName: string;
  capacity: number;
  purchasedFrom: 'MeekyCart' | 'External';
  purchasedAt?: string;
}

export interface HatchBatchRecord {
  id: string;
  ownerId: string;
  incubatorId: string;
  eggType: string;
  quantitySet: number;
  fertileCount: number;
  startDate: string;
  expectedHatchDate: string;
  status: BatchStatus;
  currentDay: number;
  totalDays: number;
  incubatorName?: string;
  targetTemp?: string;
  targetHumidity?: string;
  nextTask?: string;
}

export interface CreateBatchInput {
  eggType: 'Chicken' | 'Quail' | 'Duck';
  incubatorName: string;
  quantitySet: number;
  startDate: string;
}

export interface UpdateBatchInput extends CreateBatchInput {
  batchId: string;
}

export interface DailyLog {
  id: string;
  ownerId: string;
  batchId: string;
  loggedAt: string;
  dayNumber: number;
  temperatureC: number;
  humidityPercent: number;
  eggsTurned: boolean;
  waterAdded: boolean;
  notes?: string;
}

export interface CreateDailyLogInput {
  batchId: string;
  dayNumber: number;
  temperatureC: number;
  humidityPercent: number;
  eggsTurned: boolean;
  waterAdded: boolean;
  notes?: string;
}

export interface UpdateDailyLogInput extends CreateDailyLogInput {
  logId: string;
}

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  sourceBatchId?: string;
  title: string;
  category: 'chicks' | 'fertile-eggs' | 'birds' | 'equipment';
  quantity: number;
  price: number;
  currency: 'USD';
  location: string;
  status: ListingStatus;
  createdAt: string;
  displayPrice?: string;
  imageUrl?: string;
}

export interface CreateMarketplaceListingInput {
  sourceBatchId?: string;
  title: string;
  category: 'chicks' | 'fertile-eggs' | 'birds' | 'equipment';
  quantity: number;
  price: number;
  location: string;
  imageAssetUri?: string;
}

export interface UpdateMarketplaceListingInput extends CreateMarketplaceListingInput {
  listingId: string;
  existingImageUrl?: string;
}
