import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import {
  activeBatch,
  batches as mockBatches,
  BatchStage,
  marketplaceDrafts as mockMarketplaceDrafts,
  reminders as mockReminders,
  setupChecklist,
} from '../data/mockData';
import { getFirestoreDb } from '../lib/firebase';
import { useFirebaseSession } from '../providers/FirebaseProvider';
import { HatchBatchRecord, MarketplaceListing } from '../types/models';

const defaultState = {
  setupChecklist,
  status: 'demo' as const,
  activeBatch,
  batches: mockBatches,
  reminders: mockReminders,
  marketplaceDrafts: mockMarketplaceDrafts,
};

function mapEggType(eggType: string): 'Chicken' | 'Quail' | 'Duck' {
  if (eggType === 'Chicken' || eggType === 'Quail' || eggType === 'Duck') {
    return eggType;
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
  };
}

function normalizeListing(listing: MarketplaceListing) {
  return {
    id: listing.id,
    title: listing.title,
    location: listing.location,
    quantity: listing.quantity,
    price: listing.displayPrice ?? `$${listing.price.toFixed(2)} each`,
    status:
      listing.status === 'live'
        ? 'Live'
        : listing.status === 'sold'
          ? 'Ready to publish'
          : 'Draft',
  } as const;
}

export function useAppData() {
  const { configured, user } = useFirebaseSession();
  const [batches, setBatches] = useState(defaultState.batches);
  const [marketplaceDrafts, setMarketplaceDrafts] = useState(defaultState.marketplaceDrafts);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

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

    const unsubscribeBatches = onSnapshot(
      batchQuery,
      (snapshot) => {
        const nextBatches = snapshot.docs.map((doc) =>
          normalizeBatch({ id: doc.id, ...(doc.data() as Omit<HatchBatchRecord, 'id'>) }),
        );

        if (nextBatches.length > 0) {
          setBatches(nextBatches);
        }
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );

    const unsubscribeListings = onSnapshot(
      listingQuery,
      (snapshot) => {
        const nextListings = snapshot.docs.map((doc) =>
          normalizeListing({ id: doc.id, ...(doc.data() as Omit<MarketplaceListing, 'id'>) }),
        );

        if (nextListings.length > 0) {
          setMarketplaceDrafts(nextListings);
        }
      },
      (snapshotError) => {
        setError(snapshotError.message);
      },
    );

    return () => {
      unsubscribeBatches();
      unsubscribeListings();
    };
  }, [configured, user]);

  const active = useMemo(() => batches[0] ?? defaultState.activeBatch, [batches]);

  return {
    status: (configured ? 'live' : 'demo') as 'live' | 'demo',
    loading,
    error,
    activeBatch: active,
    batches,
    reminders: defaultState.reminders,
    marketplaceDrafts,
    setupChecklist: defaultState.setupChecklist,
  };
}
