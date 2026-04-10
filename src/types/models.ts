export type AppUserRole = 'farmer' | 'buyer' | 'admin';
export type BatchStatus = 'setup' | 'active' | 'lockdown' | 'hatched' | 'archived';
export type ListingStatus = 'draft' | 'live' | 'sold';
export type VerificationStatus = 'unverified' | 'pending' | 'verified';
export type ContactPreference = 'phone' | 'in-app';
export type DeliveryOption = 'pickup' | 'delivery' | 'either';
export type InquiryStatus = 'new' | 'contacted' | 'closed';
export type MessageSenderRole = 'buyer' | 'seller';
export type EggTypeOption =
  | 'Chicken'
  | 'Quail'
  | 'Duck'
  | 'Turkey'
  | 'Goose'
  | 'Guinea Fowl'
  | 'Pigeon'
  | 'Peafowl';

export interface AppUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  location: string;
  roles: AppUserRole[];
  incubatorIds: string[];
  createdAt: string;
  farmName?: string;
  onboardingComplete?: boolean;
  experienceLevel?: 'beginner' | 'growing' | 'advanced';
  verificationStatus?: VerificationStatus;
  marketplaceContactPreference?: ContactPreference;
  verificationSubmittedAt?: string;
  reminderPreferences?: ReminderPreferences;
  meekyCartEmail?: string;
}

export interface ReminderPreferences {
  enabled: boolean;
  dailyLogHour: number;
  turningHour: number;
  lockdownHour: number;
  hatchHour: number;
  syncedAt?: string;
}

export interface FarmProfileInput {
  fullName: string;
  phoneNumber: string;
  location: string;
  roles: AppUserRole[];
  farmName?: string;
  experienceLevel?: 'beginner' | 'growing' | 'advanced';
  marketplaceContactPreference?: ContactPreference;
  meekyCartEmail?: string;
}

export interface StoreHatchPurchaseItem {
  id: string;
  listingId?: string | null;
  title: string;
  quantity: number;
  price: number;
  imageUrl?: string | null;
  variantName?: string | null;
}

export interface StoreHatchPurchase {
  orderId: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: StoreHatchPurchaseItem[];
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
  eggType: EggTypeOption;
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
  hatchedCount?: number;
  weakCount?: number;
  unhatchedCount?: number;
  hatchNotes?: string;
  completedAt?: string;
}

export interface CreateBatchInput {
  eggType: EggTypeOption;
  incubatorName: string;
  quantitySet: number;
  startDate: string;
}

export interface UpdateBatchInput extends CreateBatchInput {
  batchId: string;
}

export interface CompleteHatchInput {
  batchId: string;
  hatchedCount: number;
  weakCount: number;
  unhatchedCount: number;
  hatchNotes?: string;
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

export interface CandlingRecord {
  id: string;
  ownerId: string;
  batchId: string;
  dayNumber: number;
  fertileCount: number;
  clearCount: number;
  removedCount: number;
  notes?: string;
  eggFindings?: string[];
  createdAt: string;
}

export interface CreateCandlingRecordInput {
  batchId: string;
  dayNumber: number;
  fertileCount: number;
  clearCount: number;
  removedCount: number;
  notes?: string;
  eggFindings?: string[];
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
  description?: string;
  availableFrom?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerFarmName?: string;
  sellerVerificationStatus?: VerificationStatus;
  contactPreference?: ContactPreference;
  deliveryOption?: DeliveryOption;
  commissionRate?: number;
  grossRevenue?: number;
  sellerNetAmount?: number;
}

export interface CreateMarketplaceListingInput {
  sourceBatchId?: string;
  title: string;
  category: 'chicks' | 'fertile-eggs' | 'birds' | 'equipment';
  quantity: number;
  price: number;
  location: string;
  description?: string;
  imageAssetUri?: string;
  deliveryOption?: DeliveryOption;
}

export interface UpdateMarketplaceListingInput extends CreateMarketplaceListingInput {
  listingId: string;
  existingImageUrl?: string;
}

export interface UpdateMarketplaceListingStatusInput {
  listingId: string;
  status: ListingStatus;
}

export interface ListingInquiry {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  buyerId: string;
  participantIds: string[];
  buyerName: string;
  buyerPhone?: string;
  message: string;
  createdAt: string;
  status: InquiryStatus;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface CreateListingInquiryInput {
  listingId: string;
  listingTitle: string;
  sellerId: string;
  message: string;
}

export interface UpdateListingInquiryStatusInput {
  inquiryId: string;
  status: InquiryStatus;
}

export interface MarketplaceMessage {
  id: string;
  threadId: string;
  listingId: string;
  sellerId: string;
  buyerId: string;
  participantIds: string[];
  senderId: string;
  senderName: string;
  senderRole: MessageSenderRole;
  message: string;
  createdAt: string;
}

export interface SavedMarketplaceListing {
  id: string;
  ownerId: string;
  listingId: string;
  createdAt: string;
}

export interface CreateMarketplaceMessageInput {
  threadId: string;
  listingId: string;
  sellerId: string;
  buyerId: string;
  message: string;
}

export interface SellerVerificationRequest {
  id: string;
  userId: string;
  fullName: string;
  farmName?: string;
  phoneNumber: string;
  location: string;
  businessType: 'farm' | 'hatchery' | 'trader';
  notes?: string;
  idDocumentReady: boolean;
  proofOfLocationReady: boolean;
  submittedAt: string;
  status: 'submitted' | 'approved';
  reviewNotes?: string;
  reviewedAt?: string;
  reviewerId?: string;
}

export interface CreateSellerVerificationRequestInput {
  businessType: 'farm' | 'hatchery' | 'trader';
  notes?: string;
  idDocumentReady: boolean;
  proofOfLocationReady: boolean;
}

export interface ReviewSellerVerificationRequestInput {
  requestId: string;
  userId: string;
  reviewNotes?: string;
}

export interface StoreCollectionProduct {
  id: string;
  title: string;
  slug?: string;
  description: string;
  brand?: string;
  price: number;
  currency: 'USD';
  imageUrl?: string | null;
  productUrl: string;
}

export interface StoreCollectionFeed {
  collection: {
    id: string;
    name: string;
    slug: string;
    url: string;
  };
  items: StoreCollectionProduct[];
}
