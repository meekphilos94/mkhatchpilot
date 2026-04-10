import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import {
  activeBatch,
  batches as mockBatches,
  BatchStage,
  eggKnowledgeGuides,
  incubatorGuides,
  marketplaceDrafts as mockMarketplaceDrafts,
  reminders as mockReminders,
  setupChecklist,
} from '../data/mockData';
import { getFirestoreDb } from '../lib/firebase';
import { defaultReminderPreferences } from '../lib/notifications';
import { fetchStoreCollection, getFallbackHatchCollection, lookupHatchPurchases } from '../lib/meekyCart';
import { uploadMarketplaceImage } from '../lib/uploads';
import { useFirebaseSession } from '../providers/FirebaseProvider';
import {
  AppUser,
  CandlingRecord,
  CompleteHatchInput,
  CreateBatchInput,
  CreateCandlingRecordInput,
  CreateDailyLogInput,
  CreateListingInquiryInput,
  CreateMarketplaceMessageInput,
  CreateMarketplaceListingInput,
  CreateSellerVerificationRequestInput,
  DailyLog,
  FarmProfileInput,
  HatchBatchRecord,
  ListingInquiry,
  MarketplaceMessage,
  MarketplaceListing,
  ReminderPreferences,
  ReviewSellerVerificationRequestInput,
  SavedMarketplaceListing,
  SellerVerificationRequest,
  StoreCollectionFeed,
  StoreHatchPurchase,
  UpdateBatchInput,
  UpdateDailyLogInput,
  UpdateListingInquiryStatusInput,
  UpdateMarketplaceListingInput,
  UpdateMarketplaceListingStatusInput,
} from '../types/models';

const eggTypeOptions: CreateBatchInput['eggType'][] = [
  'Chicken',
  'Quail',
  'Duck',
  'Turkey',
  'Goose',
  'Guinea Fowl',
  'Pigeon',
  'Peafowl',
];

const marketplaceCommissionRate = 0.05;
const ONBOARDING_STORAGE_PREFIX = '@mk-hatch-pilot/onboarding/';

function buildOnboardingStorageKey(userId: string) {
  return `${ONBOARDING_STORAGE_PREFIX}${userId}`;
}

const defaultState = {
  setupChecklist,
  status: 'demo' as const,
  activeBatch,
  batches: mockBatches,
  reminders: mockReminders,
  marketplaceDrafts: mockMarketplaceDrafts,
  publicMarketplaceListings: mockMarketplaceDrafts.filter((listing) => listing.status === 'Live'),
  incubatorGuides,
  eggKnowledgeGuides,
};

const defaultProfile: AppUser = {
  id: 'demo-user',
  fullName: 'MK Hatch Pilot Farmer',
  phoneNumber: '+263',
  location: 'Harare',
  roles: ['farmer', 'buyer'],
  incubatorIds: [],
  createdAt: new Date().toISOString(),
  farmName: 'Meeky Starter Farm',
  onboardingComplete: true,
  experienceLevel: 'beginner',
  verificationStatus: 'verified',
  marketplaceContactPreference: 'phone',
  reminderPreferences: defaultReminderPreferences,
};

const demoDailyLogs: DailyLog[] = [
  {
    id: 'demo-log-1',
    ownerId: 'demo-user',
    batchId: activeBatch.id,
    loggedAt: new Date().toISOString(),
    dayNumber: activeBatch.currentDay,
    temperatureC: 37.5,
    humidityPercent: 52,
    eggsTurned: true,
    waterAdded: true,
    notes: 'Conditions stable this morning.',
  },
];

const demoCandlingRecords: CandlingRecord[] = [
  {
    id: 'candling-1',
    ownerId: 'demo-user',
    batchId: activeBatch.id,
    dayNumber: 8,
    fertileCount: 42,
    clearCount: 4,
    removedCount: 4,
    notes: 'Removed clears and one cracked egg after candling.',
    eggFindings: ['Egg 04 clear', 'Egg 11 blood ring', 'Egg 18 cracked shell removed'],
    createdAt: new Date().toISOString(),
  },
];

const demoListingInquiries: ListingInquiry[] = [
  {
    id: 'inquiry-1',
    listingId: 'listing-1',
    listingTitle: 'Day-old Boschveld chicks',
    sellerId: 'demo-user',
    buyerId: 'buyer-demo',
    participantIds: ['demo-user', 'buyer-demo'],
    buyerName: 'Rudo Chikore',
    buyerPhone: '+263775223344',
    message: 'Hi, are 10 chicks still available for pickup this weekend?',
    createdAt: new Date().toISOString(),
    status: 'new',
    lastMessage: 'Hi, are 10 chicks still available for pickup this weekend?',
    lastMessageAt: new Date().toISOString(),
  },
];

const demoMarketplaceMessages: MarketplaceMessage[] = [
  {
    id: 'message-1',
    threadId: 'inquiry-1',
    listingId: 'listing-1',
    sellerId: 'demo-user',
    buyerId: 'buyer-demo',
    participantIds: ['demo-user', 'buyer-demo'],
    senderId: 'buyer-demo',
    senderName: 'Rudo Chikore',
    senderRole: 'buyer',
    message: 'Hi, are 10 chicks still available for pickup this weekend?',
    createdAt: new Date().toISOString(),
  },
];

function mapEggType(eggType: string): CreateBatchInput['eggType'] {
  if (eggTypeOptions.includes(eggType as CreateBatchInput['eggType'])) {
    return eggType as CreateBatchInput['eggType'];
  }

  return 'Chicken';
}

function mapBatchStage(status: string): BatchStage {
  switch (status) {
    case 'active':
      return 'Incubating';
    case 'lockdown':
      return 'Lockdown';
    case 'hatched':
      return 'Hatching';
    default:
      return 'Setup';
  }
}

function normalizeBatch(batch: HatchBatchRecord) {
  return {
    id: batch.id,
    name: `${batch.eggType} Batch`,
    eggType: mapEggType(batch.eggType),
    incubatorName: batch.incubatorName ?? 'Linked incubator',
    quantity: batch.quantitySet,
    fertileCount: batch.fertileCount,
    currentDay: batch.currentDay,
    totalDays: batch.totalDays,
    targetTemp: batch.targetTemp ?? '37.5 C',
    targetHumidity: batch.targetHumidity ?? '45-55%',
    nextTask: batch.nextTask ?? 'Add today’s temperature and humidity log.',
    stage: mapBatchStage(batch.status),
    startDate: batch.startDate,
    expectedHatchDate: batch.expectedHatchDate,
    hatchedCount: batch.hatchedCount ?? 0,
    weakCount: batch.weakCount ?? 0,
    unhatchedCount: batch.unhatchedCount ?? 0,
    hatchNotes: batch.hatchNotes,
    completedAt: batch.completedAt,
  };
}

function normalizeListing(listing: MarketplaceListing) {
  return {
    id: listing.id,
    sellerId: listing.sellerId,
    title: listing.title,
    category: listing.category,
    location: listing.location,
    quantity: listing.quantity,
    price: listing.displayPrice ?? `$${listing.price.toFixed(2)} each`,
    imageUrl: listing.imageUrl,
    description: listing.description,
    availableFrom: listing.availableFrom,
    sellerName: listing.sellerName,
    sellerPhone: listing.sellerPhone,
    sellerFarmName: listing.sellerFarmName,
    sellerVerificationStatus: listing.sellerVerificationStatus ?? 'pending',
    contactPreference: listing.contactPreference ?? 'phone',
    deliveryOption: listing.deliveryOption ?? 'pickup',
    commissionRate: listing.commissionRate ?? marketplaceCommissionRate,
    grossRevenue: listing.grossRevenue ?? listing.price * listing.quantity,
    sellerNetAmount:
      listing.sellerNetAmount ??
      listing.price * listing.quantity * (1 - (listing.commissionRate ?? marketplaceCommissionRate)),
    status:
      listing.status === 'live'
        ? 'Live'
        : listing.status === 'sold'
          ? 'Sold'
          : 'Draft',
  } as const;
}

function getSellerVerificationStatus(
  input: FarmProfileInput,
  existingProfile: AppUser | null,
  roles: AppUser['roles'],
) {
  if (!roles.includes('farmer')) {
    return 'unverified';
  }

  if (existingProfile?.verificationStatus === 'verified') {
    return 'verified';
  }

  if (
    input.fullName.trim() &&
    input.phoneNumber.trim() &&
    input.location.trim() &&
    input.farmName?.trim()
  ) {
    return 'pending';
  }

  return existingProfile?.verificationStatus ?? 'unverified';
}

function getListingFinancials(price: number, quantity: number) {
  const grossRevenue = price * quantity;
  const sellerNetAmount = grossRevenue * (1 - marketplaceCommissionRate);

  return {
    commissionRate: marketplaceCommissionRate,
    grossRevenue,
    sellerNetAmount,
  };
}

function normalizeReminderPreferences(
  preferences: Partial<ReminderPreferences> | undefined,
): ReminderPreferences {
  return {
    ...defaultReminderPreferences,
    ...preferences,
  };
}

function isPermissionDenied(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'permission-denied'
  );
}

function getBatchDefaults(eggType: CreateBatchInput['eggType']) {
  switch (eggType) {
    case 'Quail':
      return {
        totalDays: 18,
        targetTemp: '37.6 C',
        targetHumidity: '45-50%',
        nextTask: 'Stabilize temperature and log the first turn today.',
      };
    case 'Duck':
      return {
        totalDays: 28,
        targetTemp: '37.2 C',
        targetHumidity: '55-60%',
        nextTask: 'Keep humidity steady and candle on the scheduled milestone day.',
      };
    case 'Turkey':
      return {
        totalDays: 28,
        targetTemp: '37.5 C',
        targetHumidity: '50-55%',
        nextTask: 'Keep turning consistent and prepare lockdown near the last three days.',
      };
    case 'Goose':
      return {
        totalDays: 30,
        targetTemp: '37.2 C',
        targetHumidity: '55-65%',
        nextTask: 'Monitor humidity closely and plan a longer hatch window for larger eggs.',
      };
    case 'Guinea Fowl':
      return {
        totalDays: 26,
        targetTemp: '37.5 C',
        targetHumidity: '45-50%',
        nextTask: 'Candle on schedule and keep temperature steady for a clean hatch.',
      };
    case 'Pigeon':
      return {
        totalDays: 18,
        targetTemp: '37.5 C',
        targetHumidity: '50-55%',
        nextTask: 'Track carefully because smaller specialty batches can shift quickly.',
      };
    case 'Peafowl':
      return {
        totalDays: 28,
        targetTemp: '37.5 C',
        targetHumidity: '50-55%',
        nextTask: 'Maintain steady incubation conditions and prepare for a wide hatch window.',
      };
    default:
      return {
        totalDays: 21,
        targetTemp: '37.5 C',
        targetHumidity: '45-55%',
        nextTask: 'Log temperature and humidity, then turn eggs on schedule.',
      };
  }
}

export function useAppData() {
  const { configured, user } = useFirebaseSession();
  const pendingProfileRef = useRef<AppUser | null>(null);
  const purchaseLookupKeyRef = useRef<string | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(configured ? null : defaultProfile);
  const [batches, setBatches] = useState(defaultState.batches);
  const [marketplaceDrafts, setMarketplaceDrafts] = useState(defaultState.marketplaceDrafts);
  const [publicMarketplaceListings, setPublicMarketplaceListings] = useState(
    defaultState.publicMarketplaceListings,
  );
  const [dailyLogs, setDailyLogs] = useState(demoDailyLogs);
  const [candlingRecords, setCandlingRecords] = useState(demoCandlingRecords);
  const [listingInquiries, setListingInquiries] = useState(demoListingInquiries);
  const [marketplaceMessages, setMarketplaceMessages] = useState(demoMarketplaceMessages);
  const [savedMarketplaceListings, setSavedMarketplaceListings] = useState<SavedMarketplaceListing[]>([]);
  const [latestVerificationRequest, setLatestVerificationRequest] =
    useState<SellerVerificationRequest | null>(null);
  const [shopCollection, setShopCollection] = useState<StoreCollectionFeed>(
    getFallbackHatchCollection(),
  );
  const [linkedHatchPurchases, setLinkedHatchPurchases] = useState<StoreHatchPurchase[]>([]);
  const [verificationReviewQueue, setVerificationReviewQueue] = useState<
    SellerVerificationRequest[]
  >([]);
  const [loading, setLoading] = useState(configured);
  const [shopLoading, setShopLoading] = useState(true);
  const [lookingUpHatchPurchases, setLookingUpHatchPurchases] = useState(false);
  const [onboardingUnlocked, setOnboardingUnlocked] = useState(!configured);
  const [savingProfile, setSavingProfile] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [creatingDailyLog, setCreatingDailyLog] = useState(false);
  const [creatingCandlingRecord, setCreatingCandlingRecord] = useState(false);
  const [creatingListing, setCreatingListing] = useState(false);
  const [creatingInquiry, setCreatingInquiry] = useState(false);
  const [sendingMarketplaceMessage, setSendingMarketplaceMessage] = useState<string | null>(null);
  const [savingSavedListingId, setSavingSavedListingId] = useState<string | null>(null);
  const [submittingVerificationRequest, setSubmittingVerificationRequest] = useState(false);
  const [completingHatch, setCompletingHatch] = useState<string | null>(null);
  const [updatingBatch, setUpdatingBatch] = useState<string | null>(null);
  const [updatingDailyLog, setUpdatingDailyLog] = useState<string | null>(null);
  const [updatingListing, setUpdatingListing] = useState<string | null>(null);
  const [updatingListingStatus, setUpdatingListingStatus] = useState<string | null>(null);
  const [updatingInquiryStatus, setUpdatingInquiryStatus] = useState<string | null>(null);
  const [reviewingVerificationRequest, setReviewingVerificationRequest] =
    useState<string | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<string | null>(null);
  const [deletingListing, setDeletingListing] = useState<string | null>(null);
  const [deletingDailyLog, setDeletingDailyLog] = useState<string | null>(null);
  const [runningFirebaseCheck, setRunningFirebaseCheck] = useState(false);
  const [seedingStarterData, setSeedingStarterData] = useState(false);
  const [firebaseCheckResult, setFirebaseCheckResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setOnboardingUnlocked(true);
      return;
    }

    const userId = user?.uid;
    const hasCompletedLocalProfile =
      profile?.onboardingComplete || pendingProfileRef.current?.onboardingComplete;

    if (!userId) {
      if (!hasCompletedLocalProfile) {
        setOnboardingUnlocked(false);
      }
      return;
    }

    const onboardingStorageKey = buildOnboardingStorageKey(userId);
    let cancelled = false;

    async function loadCachedOnboardingState() {
      try {
        const cached = await AsyncStorage.getItem(onboardingStorageKey);

        if (!cancelled && (cached === 'complete' || cached === 'skipped')) {
          setOnboardingUnlocked(true);
        }
      } catch {
        // Ignore local cache read failures and rely on Firestore state.
      }
    }

    loadCachedOnboardingState();

    return () => {
      cancelled = true;
    };
  }, [configured, profile?.onboardingComplete, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadShopCollection() {
      setShopLoading(true);
      setShopError(null);

      try {
        const nextCollection = await fetchStoreCollection('meeky-hatch');

        if (!cancelled) {
          setShopCollection(nextCollection);
        }
      } catch (collectionError) {
        if (!cancelled) {
          setShopCollection(getFallbackHatchCollection());
          setShopError(
            collectionError instanceof Error
              ? collectionError.message
              : 'Unable to load hatch products right now.',
          );
        }
      } finally {
        if (!cancelled) {
          setShopLoading(false);
        }
      }
    }

    loadShopCollection();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const email = profile?.meekyCartEmail?.trim() ?? '';
    const phone = profile?.phoneNumber?.trim() ?? '';

    if ((!email && !phone) || linkedHatchPurchases.length > 0) {
      return;
    }

    const lookupKey = `${email}|${phone}`;

    if (purchaseLookupKeyRef.current === lookupKey) {
      return;
    }

    purchaseLookupKeyRef.current = lookupKey;

    void lookupHatchPurchases({ email, phone })
      .then((purchases) => {
        setLinkedHatchPurchases(purchases);
      })
      .catch(() => {
        // Keep this quiet so the app remains usable even when no MeekyCart order matches yet.
      });
  }, [linkedHatchPurchases.length, profile?.meekyCartEmail, profile?.phoneNumber]);

  useEffect(() => {
    if (!configured || !user) {
      setLoading(false);
      return;
    }

    const db = getFirestoreDb();

    if (!db) {
      setError('Firestore is not available.');
      setLoading(false);
      return;
    }

    const batchQuery = query(
      collection(db, 'batches'),
      where('ownerId', '==', user.uid),
      orderBy('startDate', 'desc'),
    );
    const listingQuery = query(
      collection(db, 'marketplaceListings'),
      where('sellerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    const publicListingQuery = query(
      collection(db, 'marketplaceListings'),
      where('status', '==', 'live'),
    );
    const dailyLogQuery = query(
      collection(db, 'dailyLogs'),
      where('ownerId', '==', user.uid),
      orderBy('loggedAt', 'desc'),
    );
    const candlingQuery = query(
      collection(db, 'candlingRecords'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    const inquiryQuery = query(
      collection(db, 'listingInquiries'),
      where('participantIds', 'array-contains', user.uid),
    );
    const savedListingsQuery = query(
      collection(db, 'savedMarketplaceListings'),
      where('ownerId', '==', user.uid),
    );
    const messageQuery = query(
      collection(db, 'marketplaceMessages'),
      where('participantIds', 'array-contains', user.uid),
    );
    const verificationQuery = query(
      collection(db, 'sellerVerificationRequests'),
      where('userId', '==', user.uid),
      limit(1),
    );
    const profileDocRef = doc(db, 'users', user.uid);

    const unsubscribeProfile = onSnapshot(
      profileDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const nextProfile = {
            id: snapshot.id,
            ...(snapshot.data() as Omit<AppUser, 'id'>),
          };
          pendingProfileRef.current = null;
          if (nextProfile.onboardingComplete) {
            setOnboardingUnlocked(true);
            void AsyncStorage.setItem(buildOnboardingStorageKey(nextProfile.id), 'complete');
          }
          setProfile({
            ...nextProfile,
            reminderPreferences: normalizeReminderPreferences(nextProfile.reminderPreferences),
          });
        } else {
          setProfile(pendingProfileRef.current ?? null);
        }
      },
      (snapshotError) => {
        if (!isPermissionDenied(snapshotError)) {
          setError(snapshotError.message);
        }
      },
    );

    const unsubscribeBatches = onSnapshot(
      batchQuery,
      (snapshot) => {
        const nextBatches = snapshot.docs.map((doc) =>
          normalizeBatch({ id: doc.id, ...(doc.data() as Omit<HatchBatchRecord, 'id'>) }),
        );

        setBatches(nextBatches);
        setLoading(false);
      },
      (snapshotError) => {
        if (!isPermissionDenied(snapshotError)) {
          setError(snapshotError.message);
        }
        setLoading(false);
      },
    );

    const unsubscribeListings = onSnapshot(
      listingQuery,
      (snapshot) => {
        const nextListings = snapshot.docs.map((doc) =>
          normalizeListing({ id: doc.id, ...(doc.data() as Omit<MarketplaceListing, 'id'>) }),
        );

        setMarketplaceDrafts(nextListings);
      },
      (snapshotError) => {
        if (!isPermissionDenied(snapshotError)) {
          setError(snapshotError.message);
        }
      },
    );

    const unsubscribePublicListings = onSnapshot(
      publicListingQuery,
      (snapshot) => {
        const nextListings = snapshot.docs
          .map((entry) =>
            normalizeListing({ id: entry.id, ...(entry.data() as Omit<MarketplaceListing, 'id'>) }),
          )
          .sort((left, right) => right.id.localeCompare(left.id));

        setPublicMarketplaceListings(nextListings);
      },
      () => {
        setPublicMarketplaceListings(defaultState.publicMarketplaceListings);
      },
    );

    const unsubscribeDailyLogs = onSnapshot(
      dailyLogQuery,
      (snapshot) => {
        const nextLogs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<DailyLog, 'id'>),
        }));

        setDailyLogs(nextLogs);
      },
      (snapshotError) => {
        if (!isPermissionDenied(snapshotError)) {
          setError(snapshotError.message);
        }
      },
    );

    const unsubscribeCandling = onSnapshot(
      candlingQuery,
      (snapshot) => {
        const nextRecords = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<CandlingRecord, 'id'>),
        }));

        setCandlingRecords(nextRecords);
      },
      (snapshotError) => {
        if (!isPermissionDenied(snapshotError)) {
          setError(snapshotError.message);
        }
      },
    );

    const unsubscribeInquiries = onSnapshot(
      inquiryQuery,
      (snapshot) => {
        const nextInquiries = snapshot.docs
          .map((entry) => ({
            id: entry.id,
            ...(entry.data() as Omit<ListingInquiry, 'id'>),
          }))
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

        setListingInquiries(nextInquiries);
      },
      (snapshotError) => {
        setListingInquiries(demoListingInquiries);

        if (!isPermissionDenied(snapshotError)) {
          setError(
            snapshotError instanceof Error
              ? snapshotError.message
              : 'Unable to load marketplace inquiries.',
          );
        }
      },
    );

    const unsubscribeSavedListings = onSnapshot(
      savedListingsQuery,
      (snapshot) => {
        const nextSavedListings = snapshot.docs.map((entry) => ({
          id: entry.id,
          ...(entry.data() as Omit<SavedMarketplaceListing, 'id'>),
        }));

        setSavedMarketplaceListings(nextSavedListings);
      },
      (snapshotError) => {
        setSavedMarketplaceListings([]);

        if (!isPermissionDenied(snapshotError)) {
          setError(
            snapshotError instanceof Error
              ? snapshotError.message
              : 'Unable to load saved listings.',
          );
        }
      },
    );

    const unsubscribeMessages = onSnapshot(
      messageQuery,
      (snapshot) => {
        const nextMessages = snapshot.docs
          .map((entry) => ({
            id: entry.id,
            ...(entry.data() as Omit<MarketplaceMessage, 'id'>),
          }))
          .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

        setMarketplaceMessages(nextMessages);
      },
      (snapshotError) => {
        setMarketplaceMessages(demoMarketplaceMessages);

        if (!isPermissionDenied(snapshotError)) {
          setError(
            snapshotError instanceof Error
              ? snapshotError.message
              : 'Unable to load marketplace messages.',
          );
        }
      },
    );

    const unsubscribeVerification = onSnapshot(
      verificationQuery,
      (snapshot) => {
        const nextRequest = snapshot.docs[0]
          ? ({
              id: snapshot.docs[0].id,
              ...(snapshot.docs[0].data() as Omit<SellerVerificationRequest, 'id'>),
            } satisfies SellerVerificationRequest)
          : null;

        setLatestVerificationRequest(nextRequest);
      },
      (snapshotError) => {
        setLatestVerificationRequest(null);

        if (!isPermissionDenied(snapshotError)) {
          setError(
            snapshotError instanceof Error
              ? snapshotError.message
              : 'Unable to load seller verification status.',
          );
        }
      },
    );

    let unsubscribeAdminVerification = () => {
      setVerificationReviewQueue([]);
    };

    if (profile?.roles?.includes('admin')) {
      const adminVerificationQuery = query(collection(db, 'sellerVerificationRequests'));

      unsubscribeAdminVerification = onSnapshot(
        adminVerificationQuery,
        (snapshot) => {
          const nextQueue = snapshot.docs
            .map((entry) => ({
              id: entry.id,
              ...(entry.data() as Omit<SellerVerificationRequest, 'id'>),
            }))
            .filter((entry) => entry.status === 'submitted')
            .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));

          setVerificationReviewQueue(nextQueue);
        },
        (snapshotError) => {
          setVerificationReviewQueue([]);

          if (!isPermissionDenied(snapshotError)) {
            setError(
              snapshotError instanceof Error
                ? snapshotError.message
                : 'Unable to load seller verification review queue.',
            );
          }
        },
      );
    } else {
      setVerificationReviewQueue([]);
    }

    return () => {
      unsubscribeProfile();
      unsubscribeBatches();
      unsubscribeListings();
      unsubscribePublicListings();
      unsubscribeDailyLogs();
      unsubscribeCandling();
      unsubscribeInquiries();
      unsubscribeSavedListings();
      unsubscribeMessages();
      unsubscribeVerification();
      unsubscribeAdminVerification();
    };
  }, [configured, profile?.roles, user]);

  const active = useMemo(
    () => (configured ? batches[0] ?? null : batches[0] ?? defaultState.activeBatch),
    [batches, configured],
  );
  const recentActiveBatchLog = useMemo(
    () => (active ? dailyLogs.find((log) => log.batchId === active.id) ?? null : null),
    [active, dailyLogs],
  );
  const activeBatchCandlingHistory = useMemo(
    () => (active ? candlingRecords.filter((record) => record.batchId === active.id) : []),
    [active, candlingRecords],
  );
  const linkedIncubatorGuides = useMemo(() => {
    if (linkedHatchPurchases.length === 0) {
      return [];
    }

    const matches = new Map<string, (typeof defaultState.incubatorGuides)[number]>();

    linkedHatchPurchases.forEach((purchase) => {
      purchase.items.forEach((item) => {
        const title = item.title.toLowerCase();

        defaultState.incubatorGuides.forEach((guide) => {
          const guideTitle = guide.name.toLowerCase();
          const compactMatch = guideTitle.includes('32') && (title.includes('32') || title.includes('compact'));
          const smartMatch = guideTitle.includes('64') && (title.includes('64') || title.includes('smart'));
          const proMatch = guideTitle.includes('96') && (title.includes('96') || title.includes('pro'));

          if (title.includes(guideTitle) || compactMatch || smartMatch || proMatch) {
            matches.set(guide.id, guide);
          }
        });
      });
    });

    return [...matches.values()];
  }, [linkedHatchPurchases]);
  const savedMarketplaceListingIds = useMemo(
    () => savedMarketplaceListings.map((item) => item.listingId),
    [savedMarketplaceListings],
  );
  const completedBatches = useMemo(
    () => batches.filter((batch) => Boolean(batch.completedAt)),
    [batches],
  );
  const latestCompletedBatch = useMemo(
    () =>
      [...completedBatches].sort((left, right) =>
        String(right.completedAt ?? '').localeCompare(String(left.completedAt ?? '')),
      )[0] ?? null,
    [completedBatches],
  );
  const broodingGuidance = useMemo(() => {
    if (!latestCompletedBatch) {
      return null;
    }

    const chickCount = latestCompletedBatch.hatchedCount ?? 0;
    const brooderSize =
      chickCount <= 20 ? 'small brooder ring' : chickCount <= 50 ? 'medium brooder zone' : 'large partitioned brooder';

    return {
      batchId: latestCompletedBatch.id,
      batchName: latestCompletedBatch.name,
      chickCount,
      firstWeekTemperature: '32-35 C directly under the heat source',
      secondWeekTemperature: '29-32 C with space for chicks to move away',
      waterPlan: 'Fresh clean water with shallow drinkers, changed several times daily',
      feedPlan: 'Starter crumble from day 1 with feed trays kept dry and clean',
      floorPlan: `Use a ${brooderSize} with dry bedding and strong draft protection.`,
      watchouts: [
        'Piling under the heat source means chicks are too cold.',
        'Spreading far away from heat means the brooder is too hot.',
        'Wet bedding quickly increases disease risk after hatch.',
      ],
      dailyChecklist: [
        {
          dayRange: 'Days 1-3',
          heat: 'Keep brooder heat steady at 32-35 C under the warm zone.',
          tasks: [
            'Dip beaks in water as chicks arrive so they find drinkers quickly.',
            'Use paper or trays under feed for the first day so weak chicks can find starter crumb fast.',
            'Remove wet bedding immediately and watch for piling at night.',
          ],
        },
        {
          dayRange: 'Days 4-7',
          heat: 'Slightly ease heat if chicks are spreading evenly and active.',
          tasks: [
            'Refill clean water several times a day.',
            'Check vents and draft protection so airflow stays fresh without chilling chicks.',
            'Separate weak chicks early if stronger ones are pushing them off feed.',
          ],
        },
        {
          dayRange: 'Days 8-14',
          heat: 'Reduce heat toward 29-32 C while keeping a warm retreat zone.',
          tasks: [
            'Give more floor space as chicks feather out and move more.',
            'Track any mortality or slow growers before listing chicks for sale.',
            'Plan the move from brooder to grow-out housing based on weather and feather cover.',
          ],
        },
      ],
    };
  }, [latestCompletedBatch]);
  const hatchAnalytics = useMemo(() => {
    const totalSet = completedBatches.reduce((sum, batch) => sum + batch.quantity, 0);
    const totalHatched = completedBatches.reduce(
      (sum, batch) => sum + (batch.hatchedCount ?? 0),
      0,
    );
    const totalWeak = completedBatches.reduce((sum, batch) => sum + (batch.weakCount ?? 0), 0);
    const totalUnhatched = completedBatches.reduce(
      (sum, batch) => sum + (batch.unhatchedCount ?? 0),
      0,
    );
    const bestBatch = [...completedBatches].sort((left, right) => {
      const leftRate = left.quantity > 0 ? (left.hatchedCount ?? 0) / left.quantity : 0;
      const rightRate = right.quantity > 0 ? (right.hatchedCount ?? 0) / right.quantity : 0;
      return rightRate - leftRate;
    })[0];
    const byEggType = completedBatches.reduce<Record<string, { hatched: number; set: number }>>(
      (accumulator, batch) => {
        const current = accumulator[batch.eggType] ?? { hatched: 0, set: 0 };
        current.hatched += batch.hatchedCount ?? 0;
        current.set += batch.quantity;
        accumulator[batch.eggType] = current;
        return accumulator;
      },
      {},
    );
    const topEggType = Object.entries(byEggType)
      .sort((left, right) => {
        const leftRate = left[1].set > 0 ? left[1].hatched / left[1].set : 0;
        const rightRate = right[1].set > 0 ? right[1].hatched / right[1].set : 0;
        return rightRate - leftRate;
      })
      .map(([eggType, totals]) => ({
        eggType,
        hatchRate: totals.set > 0 ? Math.round((totals.hatched / totals.set) * 100) : 0,
      }))[0];
    const byIncubator = completedBatches.reduce<Record<string, { hatched: number; set: number }>>(
      (accumulator, batch) => {
        const key = batch.incubatorName || 'Unnamed incubator';
        const current = accumulator[key] ?? { hatched: 0, set: 0 };
        current.hatched += batch.hatchedCount ?? 0;
        current.set += batch.quantity;
        accumulator[key] = current;
        return accumulator;
      },
      {},
    );
    const topIncubator = Object.entries(byIncubator)
      .sort((left, right) => {
        const leftRate = left[1].set > 0 ? left[1].hatched / left[1].set : 0;
        const rightRate = right[1].set > 0 ? right[1].hatched / right[1].set : 0;
        return rightRate - leftRate;
      })
      .map(([incubatorName, totals]) => ({
        incubatorName,
        hatchRate: totals.set > 0 ? Math.round((totals.hatched / totals.set) * 100) : 0,
      }))[0];
    const batchesReadyForSale = completedBatches.filter((batch) => (batch.hatchedCount ?? 0) > 0).length;
    const potentialChickRevenue = completedBatches.reduce(
      (sum, batch) => sum + (batch.hatchedCount ?? 0) * 1.2,
      0,
    );
    const lossRate = totalSet > 0 ? Math.round(((totalWeak + totalUnhatched) / totalSet) * 100) : 0;

    return {
      totalSet,
      totalHatched,
      totalWeak,
      totalUnhatched,
      averageHatchRate: totalSet > 0 ? Math.round((totalHatched / totalSet) * 100) : 0,
      lossRate,
      completedCount: completedBatches.length,
      batchesReadyForSale,
      potentialChickRevenue,
      bestBatchName: bestBatch?.name ?? null,
      bestBatchRate:
        bestBatch && bestBatch.quantity > 0
          ? Math.round(((bestBatch.hatchedCount ?? 0) / bestBatch.quantity) * 100)
          : null,
      topEggType: topEggType?.eggType ?? null,
      topEggTypeRate: topEggType?.hatchRate ?? null,
      topIncubatorName: topIncubator?.incubatorName ?? null,
      topIncubatorRate: topIncubator?.hatchRate ?? null,
    };
  }, [completedBatches]);
  const reminderPreferences = normalizeReminderPreferences(profile?.reminderPreferences);

  async function createBatch(input: CreateBatchInput) {
    const defaults = getBatchDefaults(input.eggType);
    const expectedHatchDate = new Date(input.startDate);
    expectedHatchDate.setDate(expectedHatchDate.getDate() + defaults.totalDays);

    const payload: Omit<HatchBatchRecord, 'id'> = {
      ownerId: user?.uid ?? 'demo-user',
      incubatorId: 'manual-entry',
      eggType: input.eggType,
      quantitySet: input.quantitySet,
      fertileCount: input.quantitySet,
      startDate: input.startDate,
      expectedHatchDate: expectedHatchDate.toISOString(),
      status: 'active',
      currentDay: 1,
      totalDays: defaults.totalDays,
      incubatorName: input.incubatorName,
      targetTemp: defaults.targetTemp,
      targetHumidity: defaults.targetHumidity,
      nextTask: defaults.nextTask,
    };

    setError(null);
    setCreatingBatch(true);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        await addDoc(collection(db, 'batches'), payload);
        return;
      }

      setBatches((current) => [
        normalizeBatch({
          id: `demo-batch-${Date.now()}`,
          ...payload,
        }),
        ...current,
      ]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create batch.');
      throw createError;
    } finally {
      setCreatingBatch(false);
    }
  }

  async function saveProfile(input: FarmProfileInput) {
    const roles = [
      ...(input.roles.length > 0 ? input.roles : profile?.roles ?? ['buyer']),
      ...(profile?.roles?.includes('admin') ? (['admin'] as const) : []),
    ].filter((role, index, current) => current.indexOf(role) === index);
    const payload: Omit<AppUser, 'id'> = {
      fullName: input.fullName.trim(),
      phoneNumber: input.phoneNumber.trim(),
      location: input.location.trim(),
      farmName: roles.includes('farmer') ? input.farmName?.trim() || undefined : undefined,
      experienceLevel: roles.includes('farmer') ? input.experienceLevel : undefined,
      roles,
      incubatorIds: profile?.incubatorIds ?? [],
      createdAt: profile?.createdAt ?? new Date().toISOString(),
      onboardingComplete: true,
      verificationStatus: getSellerVerificationStatus(input, profile, roles),
      marketplaceContactPreference:
        roles.includes('farmer')
          ? input.marketplaceContactPreference ?? profile?.marketplaceContactPreference ?? 'phone'
          : undefined,
      reminderPreferences: normalizeReminderPreferences(profile?.reminderPreferences),
      meekyCartEmail: input.meekyCartEmail?.trim() || profile?.meekyCartEmail || undefined,
    };
    const optimisticProfile: AppUser = {
      id: user?.uid ?? profile?.id ?? 'demo-user',
      ...payload,
    };

    setError(null);
    setSavingProfile(true);

    try {
      pendingProfileRef.current = optimisticProfile;
      setOnboardingUnlocked(true);
      if (optimisticProfile.id) {
        await AsyncStorage.setItem(buildOnboardingStorageKey(optimisticProfile.id), 'complete');
      }
      setProfile(optimisticProfile);
      purchaseLookupKeyRef.current = null;

      if (optimisticProfile.meekyCartEmail?.trim() || optimisticProfile.phoneNumber.trim()) {
        void lookupHatchPurchases({
          email: optimisticProfile.meekyCartEmail?.trim(),
          phone: optimisticProfile.phoneNumber.trim(),
        })
          .then((purchases) => {
            setLinkedHatchPurchases(purchases);
          })
          .catch(() => {
            // Do not block profile save if no hatch purchases are matched yet.
          });
      }

      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
        return;
      }

      setProfile(optimisticProfile);
      pendingProfileRef.current = null;
    } catch (saveError) {
      pendingProfileRef.current = null;
      setOnboardingUnlocked(false);
      if (optimisticProfile.id) {
        await AsyncStorage.removeItem(buildOnboardingStorageKey(optimisticProfile.id));
      }
      setProfile(profile);
      setError(saveError instanceof Error ? saveError.message : 'Unable to save farm profile.');
      throw saveError;
    } finally {
      setSavingProfile(false);
    }
  }

  async function skipOnboarding() {
    setError(null);
    setOnboardingUnlocked(true);

    if (!configured || !user?.uid) {
      return;
    }

    try {
      await AsyncStorage.setItem(buildOnboardingStorageKey(user.uid), 'skipped');
    } catch {
      // Ignore cache failures; this is only meant to avoid re-blocking the session.
    }
  }

  async function findLinkedHatchPurchases(input?: { email?: string; phone?: string }) {
    const email = input?.email?.trim() || profile?.meekyCartEmail?.trim() || '';
    const phone = input?.phone?.trim() || profile?.phoneNumber?.trim() || '';

    if (!email && !phone) {
      throw new Error('Add your MeekyCart email or phone number first.');
    }

    setError(null);
    setLookingUpHatchPurchases(true);

    try {
      const purchases = await lookupHatchPurchases({ email, phone });
      setLinkedHatchPurchases(purchases);
      return purchases;
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : 'Unable to look up MeekyCart hatch purchases.',
      );
      throw lookupError;
    } finally {
      setLookingUpHatchPurchases(false);
    }
  }

  async function updateBatch(input: UpdateBatchInput) {
    const defaults = getBatchDefaults(input.eggType);
    const expectedHatchDate = new Date(input.startDate);
    expectedHatchDate.setDate(expectedHatchDate.getDate() + defaults.totalDays);

    setError(null);
    setUpdatingBatch(input.batchId);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        const existing = batches.find((batch) => batch.id === input.batchId);

        await updateDoc(doc(db, 'batches', input.batchId), {
          eggType: input.eggType,
          quantitySet: input.quantitySet,
          fertileCount: Math.min(existing?.fertileCount ?? input.quantitySet, input.quantitySet),
          incubatorName: input.incubatorName,
          startDate: input.startDate,
          expectedHatchDate: expectedHatchDate.toISOString(),
          totalDays: defaults.totalDays,
          targetTemp: defaults.targetTemp,
          targetHumidity: defaults.targetHumidity,
          nextTask: defaults.nextTask,
        });
        return;
      }

      setBatches((current) =>
        current.map((batch) =>
          batch.id === input.batchId
            ? {
                ...batch,
                name: `${input.eggType} Batch`,
                eggType: input.eggType,
                incubatorName: input.incubatorName,
                quantity: input.quantitySet,
                fertileCount: Math.min(batch.fertileCount, input.quantitySet),
                startDate: input.startDate,
                expectedHatchDate: expectedHatchDate.toISOString(),
                totalDays: defaults.totalDays,
                targetTemp: defaults.targetTemp,
                targetHumidity: defaults.targetHumidity,
                nextTask: defaults.nextTask,
              }
            : batch,
        ),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update batch.');
      throw updateError;
    } finally {
      setUpdatingBatch(null);
    }
  }

  async function createDailyLog(input: CreateDailyLogInput) {
    const payload: Omit<DailyLog, 'id'> = {
      ownerId: user?.uid ?? 'demo-user',
      batchId: input.batchId,
      loggedAt: new Date().toISOString(),
      dayNumber: input.dayNumber,
      temperatureC: input.temperatureC,
      humidityPercent: input.humidityPercent,
      eggsTurned: input.eggsTurned,
      waterAdded: input.waterAdded,
      notes: input.notes?.trim() || undefined,
    };

    setError(null);
    setCreatingDailyLog(true);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        await addDoc(collection(db, 'dailyLogs'), payload);
        return;
      }

      setDailyLogs((current) => [{ id: `demo-log-${Date.now()}`, ...payload }, ...current]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to save daily log.');
      throw createError;
    } finally {
      setCreatingDailyLog(false);
    }
  }

  async function createCandlingRecord(input: CreateCandlingRecordInput) {
    const payload: Omit<CandlingRecord, 'id'> = {
      ownerId: user?.uid ?? 'demo-user',
      batchId: input.batchId,
      dayNumber: input.dayNumber,
      fertileCount: input.fertileCount,
      clearCount: input.clearCount,
      removedCount: input.removedCount,
      notes: input.notes?.trim() || undefined,
      eggFindings: input.eggFindings?.filter(Boolean) ?? [],
      createdAt: new Date().toISOString(),
    };

    setError(null);
    setCreatingCandlingRecord(true);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        await addDoc(collection(db, 'candlingRecords'), payload);
        return;
      }

      setCandlingRecords((current) => [{ id: `demo-candling-${Date.now()}`, ...payload }, ...current]);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'Unable to save candling record.',
      );
      throw createError;
    } finally {
      setCreatingCandlingRecord(false);
    }
  }

  async function updateDailyLog(input: UpdateDailyLogInput) {
    const payload = {
      dayNumber: input.dayNumber,
      temperatureC: input.temperatureC,
      humidityPercent: input.humidityPercent,
      eggsTurned: input.eggsTurned,
      waterAdded: input.waterAdded,
      notes: input.notes?.trim() || undefined,
      loggedAt: new Date().toISOString(),
    };

    setError(null);
    setUpdatingDailyLog(input.logId);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        await updateDoc(doc(db, 'dailyLogs', input.logId), payload);
        return;
      }

      setDailyLogs((current) =>
        current.map((log) => (log.id === input.logId ? { ...log, ...payload } : log)),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update daily log.');
      throw updateError;
    } finally {
      setUpdatingDailyLog(null);
    }
  }

  async function createMarketplaceListing(input: CreateMarketplaceListingInput) {
    const financials = getListingFinancials(input.price, input.quantity);
    const payload: Omit<MarketplaceListing, 'id'> = {
      sellerId: user?.uid ?? 'demo-user',
      sourceBatchId: input.sourceBatchId,
      title: input.title.trim(),
      category: input.category,
      quantity: input.quantity,
      price: input.price,
      currency: 'USD',
      location: input.location.trim(),
      status: 'draft',
      createdAt: new Date().toISOString(),
      displayPrice: `$${input.price.toFixed(2)} each`,
      imageUrl: undefined,
      description: input.description?.trim() || undefined,
      availableFrom: new Date().toISOString(),
      sellerName: profile?.fullName,
      sellerPhone: profile?.phoneNumber,
      sellerFarmName: profile?.farmName,
      sellerVerificationStatus: profile?.verificationStatus ?? 'pending',
      contactPreference: profile?.marketplaceContactPreference ?? 'phone',
      deliveryOption: input.deliveryOption ?? 'pickup',
      ...financials,
    };

    setError(null);
    setCreatingListing(true);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        const imageUrl = input.imageAssetUri
          ? await uploadMarketplaceImage({
              ownerId: user.uid,
              listingTitle: input.title.trim(),
              uri: input.imageAssetUri,
            })
          : undefined;

        await addDoc(collection(db, 'marketplaceListings'), {
          ...payload,
          imageUrl,
        });
        return;
      }

      setMarketplaceDrafts((current) => [
        normalizeListing({
          id: `demo-listing-${Date.now()}`,
          ...payload,
          imageUrl: input.imageAssetUri,
        }),
        ...current,
      ]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create listing.');
      throw createError;
    } finally {
      setCreatingListing(false);
    }
  }

  async function completeHatch(input: CompleteHatchInput) {
    setError(null);
    setCompletingHatch(input.batchId);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        await updateDoc(doc(db, 'batches', input.batchId), {
          status: 'hatched',
          hatchedCount: input.hatchedCount,
          weakCount: input.weakCount,
          unhatchedCount: input.unhatchedCount,
          hatchNotes: input.hatchNotes?.trim() || undefined,
          completedAt: new Date().toISOString(),
          nextTask: 'Review hatch results and create a marketplace listing for available chicks.',
        });
        return;
      }

      setBatches((current) =>
        current.map((batch) =>
          batch.id === input.batchId
            ? {
                ...batch,
                stage: 'Hatching' as const,
                hatchedCount: input.hatchedCount,
                weakCount: input.weakCount,
                unhatchedCount: input.unhatchedCount,
                hatchNotes: input.hatchNotes?.trim() || undefined,
                completedAt: new Date().toISOString(),
                nextTask: 'Review hatch results and create a marketplace listing for available chicks.',
              }
            : batch,
        ),
      );
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : 'Unable to save hatch results.');
      throw completeError;
    } finally {
      setCompletingHatch(null);
    }
  }

  async function updateMarketplaceListing(input: UpdateMarketplaceListingInput) {
    const financials = getListingFinancials(input.price, input.quantity);
    const payload = {
      title: input.title.trim(),
      category: input.category,
      quantity: input.quantity,
      price: input.price,
      location: input.location.trim(),
      displayPrice: `$${input.price.toFixed(2)} each`,
      description: input.description?.trim() || undefined,
      deliveryOption: input.deliveryOption ?? 'pickup',
      sellerVerificationStatus: profile?.verificationStatus ?? 'pending',
      contactPreference: profile?.marketplaceContactPreference ?? 'phone',
      ...financials,
    };

    setError(null);
    setUpdatingListing(input.listingId);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        const imageUrl = input.imageAssetUri
          ? await uploadMarketplaceImage({
              ownerId: user.uid,
              listingTitle: payload.title,
              uri: input.imageAssetUri,
            })
          : input.existingImageUrl;

        await updateDoc(doc(db, 'marketplaceListings', input.listingId), {
          ...payload,
          sourceBatchId: input.sourceBatchId,
          imageUrl,
          sellerName: profile?.fullName,
          sellerPhone: profile?.phoneNumber,
          sellerFarmName: profile?.farmName,
        });
        return;
      }

      setMarketplaceDrafts((current) =>
        current.map((listing) =>
          listing.id === input.listingId
            ? normalizeListing({
                id: listing.id,
                sellerId: user?.uid ?? 'demo-user',
                sourceBatchId: input.sourceBatchId,
                title: payload.title,
                category: input.category,
                quantity: input.quantity,
                price: input.price,
                currency: 'USD',
                location: payload.location,
                status: 'draft',
                createdAt: new Date().toISOString(),
                displayPrice: payload.displayPrice,
                imageUrl: input.imageAssetUri ?? input.existingImageUrl,
                description: payload.description,
                availableFrom: new Date().toISOString(),
                sellerName: profile?.fullName,
                sellerPhone: profile?.phoneNumber,
                sellerFarmName: profile?.farmName,
                sellerVerificationStatus: payload.sellerVerificationStatus,
                contactPreference: payload.contactPreference,
                deliveryOption: payload.deliveryOption,
                commissionRate: payload.commissionRate,
                grossRevenue: payload.grossRevenue,
                sellerNetAmount: payload.sellerNetAmount,
              })
            : listing,
        ),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : 'Unable to update marketplace listing.',
      );
      throw updateError;
    } finally {
      setUpdatingListing(null);
    }
  }

  async function updateMarketplaceListingStatus(input: UpdateMarketplaceListingStatusInput) {
    setError(null);
    setUpdatingListingStatus(input.listingId);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        await updateDoc(doc(db, 'marketplaceListings', input.listingId), {
          status: input.status,
        });
        return;
      }

      setMarketplaceDrafts((current) =>
        current.map((listing) =>
          listing.id === input.listingId
            ? {
                ...listing,
                status:
                  input.status === 'live'
                    ? 'Live'
                    : input.status === 'sold'
                      ? 'Sold'
                      : 'Draft',
              }
            : listing,
        ),
      );
    } catch (statusError) {
      setError(
        statusError instanceof Error ? statusError.message : 'Unable to update listing status.',
      );
      throw statusError;
    } finally {
      setUpdatingListingStatus(null);
    }
  }

  async function createListingInquiry(input: CreateListingInquiryInput) {
    const now = new Date().toISOString();
    const buyerId = user?.uid ?? 'demo-user';
    const trimmedMessage = input.message.trim();

    setError(null);
    setCreatingInquiry(true);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        const threadId = doc(collection(db, 'listingInquiries')).id;
        const payload: Omit<ListingInquiry, 'id'> = {
          listingId: input.listingId,
          listingTitle: input.listingTitle,
          sellerId: input.sellerId,
          buyerId,
          participantIds: [input.sellerId, buyerId],
          buyerName: profile?.fullName ?? 'Marketplace buyer',
          buyerPhone: profile?.phoneNumber,
          message: trimmedMessage,
          createdAt: now,
          status: 'new',
          lastMessage: trimmedMessage,
          lastMessageAt: now,
        };
        const openingMessage: Omit<MarketplaceMessage, 'id'> = {
          threadId,
          listingId: input.listingId,
          sellerId: input.sellerId,
          buyerId,
          participantIds: [input.sellerId, buyerId],
          senderId: buyerId,
          senderName: profile?.fullName ?? 'Marketplace buyer',
          senderRole: 'buyer',
          message: trimmedMessage,
          createdAt: now,
        };
        const writer = writeBatch(db);
        const inquiryRef = doc(db, 'listingInquiries', threadId);
        const messageRef = doc(collection(db, 'marketplaceMessages'));
        writer.set(inquiryRef, payload);
        writer.set(messageRef, openingMessage);
        await writer.commit();
        return;
      }

      const threadId = `demo-inquiry-${Date.now()}`;
      const payload: Omit<ListingInquiry, 'id'> = {
        listingId: input.listingId,
        listingTitle: input.listingTitle,
        sellerId: input.sellerId,
        buyerId,
        participantIds: [input.sellerId, buyerId],
        buyerName: profile?.fullName ?? 'Marketplace buyer',
        buyerPhone: profile?.phoneNumber,
        message: trimmedMessage,
        createdAt: now,
        status: 'new',
        lastMessage: trimmedMessage,
        lastMessageAt: now,
      };
      const openingMessage: Omit<MarketplaceMessage, 'id'> = {
        threadId,
        listingId: input.listingId,
        sellerId: input.sellerId,
        buyerId,
        participantIds: [input.sellerId, buyerId],
        senderId: buyerId,
        senderName: profile?.fullName ?? 'Marketplace buyer',
        senderRole: 'buyer',
        message: trimmedMessage,
        createdAt: now,
      };
      setListingInquiries((current) => [{ id: threadId, ...payload }, ...current]);
      setMarketplaceMessages((current) => [{ id: `demo-message-${Date.now()}`, ...openingMessage }, ...current]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to send buyer inquiry.');
      throw createError;
    } finally {
      setCreatingInquiry(false);
    }
  }

  async function sendMarketplaceMessage(input: CreateMarketplaceMessageInput) {
    const now = new Date().toISOString();
    const senderId = user?.uid ?? 'demo-user';
    const payload: Omit<MarketplaceMessage, 'id'> = {
      threadId: input.threadId,
      listingId: input.listingId,
      sellerId: input.sellerId,
      buyerId: input.buyerId,
      participantIds: [input.sellerId, input.buyerId],
      senderId,
      senderName: profile?.fullName ?? 'Marketplace user',
      senderRole: senderId === input.sellerId ? 'seller' : 'buyer',
      message: input.message.trim(),
      createdAt: now,
    };

    setError(null);
    setSendingMarketplaceMessage(input.threadId);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        await addDoc(collection(db, 'marketplaceMessages'), payload);
        await updateDoc(doc(db, 'listingInquiries', input.threadId), {
          lastMessage: payload.message,
          lastMessageAt: now,
          status: senderId === input.sellerId ? 'contacted' : 'new',
        });
        return;
      }

      setMarketplaceMessages((current) => [{ id: `demo-message-${Date.now()}`, ...payload }, ...current]);
      setListingInquiries((current) =>
        current.map((inquiry) =>
          inquiry.id === input.threadId
            ? {
                ...inquiry,
                lastMessage: payload.message,
                lastMessageAt: now,
                status: payload.senderRole === 'seller' ? 'contacted' : 'new',
              }
            : inquiry,
        ),
      );
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send marketplace message.');
      throw sendError;
    } finally {
      setSendingMarketplaceMessage(null);
    }
  }

  async function toggleSavedMarketplaceListing(listingId: string) {
    setSavingSavedListingId(listingId);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        const existingSavedListing = savedMarketplaceListings.find(
          (savedListing) => savedListing.listingId === listingId,
        );

        if (existingSavedListing) {
          await deleteDoc(doc(db, 'savedMarketplaceListings', existingSavedListing.id));
        } else {
          await addDoc(collection(db, 'savedMarketplaceListings'), {
            ownerId: user.uid,
            listingId,
            createdAt: new Date().toISOString(),
          });
        }

        return;
      }

      setSavedMarketplaceListings((current) => {
        const existingSavedListing = current.find((savedListing) => savedListing.listingId === listingId);

        if (existingSavedListing) {
          return current.filter((savedListing) => savedListing.listingId !== listingId);
        }

        return [
          {
            id: `demo-saved-${Date.now()}`,
            ownerId: user?.uid ?? 'demo-user',
            listingId,
            createdAt: new Date().toISOString(),
          },
          ...current,
        ];
      });
    } finally {
      setSavingSavedListingId(null);
    }
  }

  async function updateListingInquiryStatus(input: UpdateListingInquiryStatusInput) {
    setError(null);
    setUpdatingInquiryStatus(input.inquiryId);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        await updateDoc(doc(db, 'listingInquiries', input.inquiryId), {
          status: input.status,
        });
        return;
      }

      setListingInquiries((current) =>
        current.map((inquiry) =>
          inquiry.id === input.inquiryId ? { ...inquiry, status: input.status } : inquiry,
        ),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update inquiry status.');
      throw updateError;
    } finally {
      setUpdatingInquiryStatus(null);
    }
  }

  async function submitVerificationRequest(input: CreateSellerVerificationRequestInput) {
    const payload: Omit<SellerVerificationRequest, 'id'> = {
      userId: user?.uid ?? 'demo-user',
      fullName: profile?.fullName ?? 'Unknown seller',
      farmName: profile?.farmName,
      phoneNumber: profile?.phoneNumber ?? '',
      location: profile?.location ?? '',
      businessType: input.businessType,
      notes: input.notes?.trim() || undefined,
      idDocumentReady: input.idDocumentReady,
      proofOfLocationReady: input.proofOfLocationReady,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    };

    setError(null);
    setSubmittingVerificationRequest(true);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        await addDoc(collection(db, 'sellerVerificationRequests'), payload);
        await setDoc(
          doc(db, 'users', user.uid),
          {
            verificationStatus: 'pending',
            verificationSubmittedAt: payload.submittedAt,
          },
          { merge: true },
        );
        return;
      }

      setLatestVerificationRequest({ id: `verification-${Date.now()}`, ...payload });
      setProfile((current) =>
        current
          ? {
              ...current,
              verificationStatus: 'pending',
              verificationSubmittedAt: payload.submittedAt,
            }
          : current,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Unable to submit verification request.',
      );
      throw submitError;
    } finally {
      setSubmittingVerificationRequest(false);
    }
  }

  async function reviewSellerVerificationRequest(input: ReviewSellerVerificationRequestInput) {
    setError(null);
    setReviewingVerificationRequest(input.requestId);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        const reviewedAt = new Date().toISOString();
        const writer = writeBatch(db);
        writer.update(doc(db, 'sellerVerificationRequests', input.requestId), {
          status: 'approved',
          reviewNotes: input.reviewNotes?.trim() || undefined,
          reviewedAt,
          reviewerId: user.uid,
        });
        writer.set(
          doc(db, 'users', input.userId),
          {
            verificationStatus: 'verified',
          },
          { merge: true },
        );
        await writer.commit();
        return;
      }

      setVerificationReviewQueue((current) => current.filter((request) => request.id !== input.requestId));
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'Unable to review verification request.',
      );
      throw reviewError;
    } finally {
      setReviewingVerificationRequest(null);
    }
  }

  async function saveReminderPreferences(input: ReminderPreferences) {
    const payload = {
      reminderPreferences: {
        ...input,
        syncedAt: new Date().toISOString(),
      },
    };

    setError(null);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
        return;
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              reminderPreferences: normalizeReminderPreferences(payload.reminderPreferences),
            }
          : current,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Unable to save reminder preferences.',
      );
      throw saveError;
    }
  }

  async function deleteBatch(batchId: string) {
    setError(null);
    setDeletingBatch(batchId);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        const batchWriter = writeBatch(db);
        batchWriter.delete(doc(db, 'batches', batchId));

        const linkedLogs = await getDocs(
          query(
            collection(db, 'dailyLogs'),
            where('ownerId', '==', user.uid),
            where('batchId', '==', batchId),
          ),
        );
        const linkedCandling = await getDocs(
          query(
            collection(db, 'candlingRecords'),
            where('ownerId', '==', user.uid),
            where('batchId', '==', batchId),
          ),
        );

        linkedLogs.docs.forEach((logDoc) => {
          batchWriter.delete(logDoc.ref);
        });
        linkedCandling.docs.forEach((recordDoc) => {
          batchWriter.delete(recordDoc.ref);
        });

        await batchWriter.commit();
        return;
      }

      setBatches((current) => current.filter((batch) => batch.id !== batchId));
      setDailyLogs((current) => current.filter((log) => log.batchId !== batchId));
      setCandlingRecords((current) => current.filter((record) => record.batchId !== batchId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete batch.');
      throw deleteError;
    } finally {
      setDeletingBatch(null);
    }
  }

  async function deleteDailyLog(logId: string) {
    setError(null);
    setDeletingDailyLog(logId);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        await deleteDoc(doc(db, 'dailyLogs', logId));
        return;
      }

      setDailyLogs((current) => current.filter((log) => log.id !== logId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete daily log.');
      throw deleteError;
    } finally {
      setDeletingDailyLog(null);
    }
  }

  async function deleteMarketplaceListing(listingId: string) {
    setError(null);
    setDeletingListing(listingId);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        await deleteDoc(doc(db, 'marketplaceListings', listingId));
        return;
      }

      setMarketplaceDrafts((current) => current.filter((listing) => listing.id !== listingId));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Unable to delete marketplace listing.',
      );
      throw deleteError;
    } finally {
      setDeletingListing(null);
    }
  }

  async function runFirebaseCheck() {
    if (!configured || !user) {
      setFirebaseCheckResult('Firebase check skipped because the app is still in demo mode.');
      return;
    }

    const db = getFirestoreDb();

    if (!db) {
      throw new Error('Firestore is not available.');
    }

    setRunningFirebaseCheck(true);
    setFirebaseCheckResult(null);
    setError(null);

    try {
      const testBatch = await addDoc(collection(db, 'batches'), {
        ownerId: user.uid,
        incubatorId: 'firebase-check',
        eggType: 'Chicken',
        quantitySet: 1,
        fertileCount: 1,
        startDate: new Date().toISOString().slice(0, 10),
        expectedHatchDate: new Date().toISOString(),
        status: 'setup',
        currentDay: 0,
        totalDays: 21,
        incubatorName: 'Firebase Check',
        targetTemp: '37.5 C',
        targetHumidity: '45-55%',
        nextTask: 'Temporary write check',
      });

      const readable = await getDocs(
        query(collection(db, 'batches'), where('ownerId', '==', user.uid), limit(1)),
      );

      await deleteDoc(doc(db, 'batches', testBatch.id));

      setFirebaseCheckResult(
        readable.empty
          ? 'Firebase write worked, but no readable batches were found after the check.'
          : 'Firebase rules look good for signed-in owner reads and writes.',
      );
    } catch (checkError) {
      const message =
        checkError instanceof Error ? checkError.message : 'Firebase check failed.';
      setError(message);
      setFirebaseCheckResult(`Firebase check failed: ${message}`);
      throw checkError;
    } finally {
      setRunningFirebaseCheck(false);
    }
  }

  async function seedStarterData() {
    const today = new Date().toISOString().slice(0, 10);
    const starterBatchInput: CreateBatchInput = {
      eggType: 'Chicken',
      incubatorName: 'MK Starter Incubator',
      quantitySet: 24,
      startDate: today,
    };

    setSeedingStarterData(true);
    setError(null);

    try {
      if (configured && user) {
        const db = getFirestoreDb();

        if (!db) {
          throw new Error('Firestore is not available.');
        }

        const defaults = getBatchDefaults(starterBatchInput.eggType);
        const expectedHatchDate = new Date(starterBatchInput.startDate);
        expectedHatchDate.setDate(expectedHatchDate.getDate() + defaults.totalDays);

        const batchRef = await addDoc(collection(db, 'batches'), {
          ownerId: user.uid,
          incubatorId: 'seed-incubator',
          eggType: starterBatchInput.eggType,
          quantitySet: starterBatchInput.quantitySet,
          fertileCount: 22,
          startDate: starterBatchInput.startDate,
          expectedHatchDate: expectedHatchDate.toISOString(),
          status: 'active',
          currentDay: 1,
          totalDays: defaults.totalDays,
          incubatorName: starterBatchInput.incubatorName,
          targetTemp: defaults.targetTemp,
          targetHumidity: defaults.targetHumidity,
          nextTask: defaults.nextTask,
        });

          await addDoc(collection(db, 'dailyLogs'), {
            ownerId: user.uid,
            batchId: batchRef.id,
            loggedAt: new Date().toISOString(),
          dayNumber: 1,
          temperatureC: 37.5,
          humidityPercent: 53,
          eggsTurned: true,
            waterAdded: true,
            notes: 'Starter hatch seeded from MK Hatch Pilot.',
          });

          await addDoc(collection(db, 'candlingRecords'), {
            ownerId: user.uid,
            batchId: batchRef.id,
            dayNumber: 7,
            fertileCount: 22,
            clearCount: 2,
            removedCount: 2,
            notes: 'Starter candling result seeded for demo visibility.',
            createdAt: new Date().toISOString(),
          });

        await addDoc(collection(db, 'marketplaceListings'), {
          sellerId: user.uid,
          sourceBatchId: batchRef.id,
          title: 'Day-old starter chicks',
          category: 'chicks',
          quantity: 12,
          price: 1.2,
          currency: 'USD',
          location: 'Harare',
          status: 'draft',
          createdAt: new Date().toISOString(),
          displayPrice: '$1.20 each',
          description: 'Freshly hatched starter chicks ready for brooding.',
          availableFrom: new Date().toISOString(),
          sellerName: profile?.fullName ?? defaultProfile.fullName,
          sellerPhone: profile?.phoneNumber ?? defaultProfile.phoneNumber,
          sellerFarmName: profile?.farmName ?? defaultProfile.farmName,
          sellerVerificationStatus: profile?.verificationStatus ?? defaultProfile.verificationStatus,
          contactPreference:
            profile?.marketplaceContactPreference ?? defaultProfile.marketplaceContactPreference,
          deliveryOption: 'pickup',
          ...getListingFinancials(1.2, 12),
        });

        return;
      }

      await createBatch(starterBatchInput);
      const seededBatchId = `demo-batch-${Date.now()}`;
        setDailyLogs((current) => [
        {
          id: `demo-log-${Date.now()}`,
          ownerId: 'demo-user',
          batchId: current[0]?.batchId ?? active.id ?? seededBatchId,
          loggedAt: new Date().toISOString(),
          dayNumber: 1,
          temperatureC: 37.5,
          humidityPercent: 53,
          eggsTurned: true,
          waterAdded: true,
          notes: 'Starter hatch seeded in demo mode.',
        },
          ...current,
        ]);
        setCandlingRecords((current) => [
          {
            id: `demo-candling-${Date.now()}`,
            ownerId: 'demo-user',
            batchId: current[0]?.batchId ?? active.id ?? seededBatchId,
            dayNumber: 7,
            fertileCount: 22,
            clearCount: 2,
            removedCount: 2,
            notes: 'Starter candling result seeded in demo mode.',
            createdAt: new Date().toISOString(),
          },
          ...current,
        ]);
        setMarketplaceDrafts((current) => [
        {
          id: `demo-market-${Date.now()}`,
          title: 'Day-old starter chicks',
          category: 'chicks',
          location: 'Harare',
          quantity: 12,
          price: '$1.20 each',
          status: 'Draft',
        },
        ...current,
      ]);
    } finally {
      setSeedingStarterData(false);
    }
  }

  return {
    status: (configured ? 'live' : 'demo') as 'live' | 'demo',
    loading,
      savingProfile,
      creatingBatch,
      creatingDailyLog,
      creatingCandlingRecord,
    creatingListing,
    creatingInquiry,
    savingSavedListingId,
    sendingMarketplaceMessage,
    submittingVerificationRequest,
    shopLoading,
    completingHatch,
    updatingBatch,
    updatingDailyLog,
    updatingListing,
    updatingListingStatus,
    updatingInquiryStatus,
    reviewingVerificationRequest,
    deletingBatch,
    deletingDailyLog,
    deletingListing,
    runningFirebaseCheck,
    seedingStarterData,
      error,
      shopError,
      firebaseCheckResult,
      profile,
      linkedHatchPurchases,
      latestVerificationRequest,
      verificationReviewQueue,
      needsOnboarding:
        !onboardingUnlocked &&
        !profile?.onboardingComplete &&
        !pendingProfileRef.current?.onboardingComplete,
      activeBatch: active,
      recentActiveBatchLog,
      activeBatchCandlingHistory,
      broodingGuidance,
      batches,
      hatchAnalytics,
      linkedIncubatorGuides,
      reminders: defaultState.reminders,
    reminderPreferences,
    marketplaceDrafts,
    shopCollection,
    publicMarketplaceListings,
    savedMarketplaceListingIds,
    listingInquiries,
    marketplaceMessages,
    setupChecklist: defaultState.setupChecklist,
    incubatorGuides: defaultState.incubatorGuides,
      eggKnowledgeGuides: defaultState.eggKnowledgeGuides,
      saveProfile,
      skipOnboarding,
      createBatch,
      createDailyLog,
      createCandlingRecord,
    createMarketplaceListing,
    createListingInquiry,
    toggleSavedMarketplaceListing,
    sendMarketplaceMessage,
    completeHatch,
    updateBatch,
    updateDailyLog,
    updateMarketplaceListing,
    updateMarketplaceListingStatus,
    updateListingInquiryStatus,
    deleteBatch,
    deleteDailyLog,
    deleteMarketplaceListing,
    submitVerificationRequest,
      reviewSellerVerificationRequest,
      saveReminderPreferences,
      findLinkedHatchPurchases,
      lookingUpHatchPurchases,
      runFirebaseCheck,
    seedStarterData,
  };
}
