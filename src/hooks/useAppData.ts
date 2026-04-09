import { useEffect, useMemo, useState } from 'react';
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
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import {
  activeBatch,
  batches as mockBatches,
  BatchStage,
  marketplaceDrafts as mockMarketplaceDrafts,
  reminders as mockReminders,
  setupChecklist,
} from '../data/mockData';
import { getFirestoreDb } from '../lib/firebase';
import { uploadMarketplaceImage } from '../lib/uploads';
import { useFirebaseSession } from '../providers/FirebaseProvider';
import {
  CreateBatchInput,
  CreateDailyLogInput,
  CreateMarketplaceListingInput,
  DailyLog,
  HatchBatchRecord,
  MarketplaceListing,
  UpdateBatchInput,
  UpdateDailyLogInput,
  UpdateMarketplaceListingInput,
} from '../types/models';

const defaultState = {
  setupChecklist,
  status: 'demo' as const,
  activeBatch,
  batches: mockBatches,
  reminders: mockReminders,
  marketplaceDrafts: mockMarketplaceDrafts,
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
    startDate: batch.startDate,
    expectedHatchDate: batch.expectedHatchDate,
  };
}

function normalizeListing(listing: MarketplaceListing) {
  return {
    id: listing.id,
    title: listing.title,
    category: listing.category,
    location: listing.location,
    quantity: listing.quantity,
    price: listing.displayPrice ?? `$${listing.price.toFixed(2)} each`,
    imageUrl: listing.imageUrl,
    status:
      listing.status === 'live'
        ? 'Live'
        : listing.status === 'sold'
          ? 'Ready to publish'
          : 'Draft',
  } as const;
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
  const [batches, setBatches] = useState(defaultState.batches);
  const [marketplaceDrafts, setMarketplaceDrafts] = useState(defaultState.marketplaceDrafts);
  const [dailyLogs, setDailyLogs] = useState(demoDailyLogs);
  const [loading, setLoading] = useState(configured);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [creatingDailyLog, setCreatingDailyLog] = useState(false);
  const [creatingListing, setCreatingListing] = useState(false);
  const [updatingBatch, setUpdatingBatch] = useState<string | null>(null);
  const [updatingDailyLog, setUpdatingDailyLog] = useState<string | null>(null);
  const [updatingListing, setUpdatingListing] = useState<string | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<string | null>(null);
  const [deletingListing, setDeletingListing] = useState<string | null>(null);
  const [deletingDailyLog, setDeletingDailyLog] = useState<string | null>(null);
  const [runningFirebaseCheck, setRunningFirebaseCheck] = useState(false);
  const [seedingStarterData, setSeedingStarterData] = useState(false);
  const [firebaseCheckResult, setFirebaseCheckResult] = useState<string | null>(null);
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
    const dailyLogQuery = query(
      collection(db, 'dailyLogs'),
      where('ownerId', '==', user.uid),
      orderBy('loggedAt', 'desc'),
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

        setMarketplaceDrafts(nextListings);
      },
      (snapshotError) => {
        setError(snapshotError.message);
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
        setError(snapshotError.message);
      },
    );

    return () => {
      unsubscribeBatches();
      unsubscribeListings();
      unsubscribeDailyLogs();
    };
  }, [configured, user]);

  const active = useMemo(
    () => (configured ? batches[0] ?? null : batches[0] ?? defaultState.activeBatch),
    [batches, configured],
  );
  const recentActiveBatchLog = useMemo(
    () => (active ? dailyLogs.find((log) => log.batchId === active.id) ?? null : null),
    [active, dailyLogs],
  );

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

  async function updateMarketplaceListing(input: UpdateMarketplaceListingInput) {
    const payload = {
      title: input.title.trim(),
      category: input.category,
      quantity: input.quantity,
      price: input.price,
      location: input.location.trim(),
      displayPrice: `$${input.price.toFixed(2)} each`,
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

        linkedLogs.docs.forEach((logDoc) => {
          batchWriter.delete(logDoc.ref);
        });

        await batchWriter.commit();
        return;
      }

      setBatches((current) => current.filter((batch) => batch.id !== batchId));
      setDailyLogs((current) => current.filter((log) => log.batchId !== batchId));
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
    creatingBatch,
    creatingDailyLog,
    creatingListing,
    updatingBatch,
    updatingDailyLog,
    updatingListing,
    deletingBatch,
    deletingDailyLog,
    deletingListing,
    runningFirebaseCheck,
    seedingStarterData,
    error,
    firebaseCheckResult,
    activeBatch: active,
    recentActiveBatchLog,
    batches,
    reminders: defaultState.reminders,
    marketplaceDrafts,
    setupChecklist: defaultState.setupChecklist,
    createBatch,
    createDailyLog,
    createMarketplaceListing,
    updateBatch,
    updateDailyLog,
    updateMarketplaceListing,
    deleteBatch,
    deleteDailyLog,
    deleteMarketplaceListing,
    runFirebaseCheck,
    seedStarterData,
  };
}
