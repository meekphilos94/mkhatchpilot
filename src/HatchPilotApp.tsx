import { useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { DashboardReminder } from './data/mockData';
import { useAppData } from './hooks/useAppData';
import { useBatchReminders } from './hooks/useBatchReminders';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useFirebaseSession } from './providers/FirebaseProvider';
import { colors } from './theme';
import {
  AppUserRole,
  ContactPreference,
  CompleteHatchInput,
  CreateBatchInput,
  CreateCandlingRecordInput,
  CreateDailyLogInput,
  CreateListingInquiryInput,
  CreateMarketplaceMessageInput,
  CreateMarketplaceListingInput,
  CreateSellerVerificationRequestInput,
  DeliveryOption,
  FarmProfileInput,
  InquiryStatus,
  ListingInquiry,
  MarketplaceMessage,
  ReminderPreferences,
  ReviewSellerVerificationRequestInput,
  UpdateBatchInput,
  UpdateDailyLogInput,
  UpdateListingInquiryStatusInput,
  UpdateMarketplaceListingInput,
  VerificationStatus,
} from './types/models';

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

type TabKey = 'overview' | 'batches' | 'marketplace' | 'profile';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];
const tabs: { key: TabKey; label: string; icon: TabIconName; iconActive: TabIconName }[] = [
  { key: 'overview', label: 'Today', icon: 'calendar-outline', iconActive: 'calendar' },
  { key: 'batches', label: 'Batches', icon: 'layers-outline', iconActive: 'layers' },
  { key: 'marketplace', label: 'Market', icon: 'basket-outline', iconActive: 'basket' },
  { key: 'profile', label: 'Profile', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

type AccountMode = 'buyer' | 'seller' | 'both';

function rolesToAccountMode(roles: AppUserRole[] | undefined): AccountMode {
  const canBuy = roles?.includes('buyer');
  const canSell = roles?.includes('farmer');

  if (canBuy && canSell) {
    return 'both';
  }

  if (canSell) {
    return 'seller';
  }

  return 'buyer';
}

function accountModeToRoles(mode: AccountMode): AppUserRole[] {
  switch (mode) {
    case 'seller':
      return ['farmer'];
    case 'both':
      return ['farmer', 'buyer'];
    default:
      return ['buyer'];
  }
}

function formatFirebaseBannerMessage(message: string | null | undefined) {
  if (!message) {
    return null;
  }

  const lower = message.toLowerCase();

  if (lower.includes('permission') || lower.includes('insufficient permissions')) {
    return 'Some live Firebase features still need published rules. Core app sections can still load while we finish setup.';
  }

  if (lower.includes('index') && lower.includes('create')) {
    return 'A Firestore index is still building or missing for one of the newer features. The main app can continue while indexes are completed.';
  }

  return message;
}

export function HatchPilotApp() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const {
    configured,
    loading: sessionLoading,
    authError,
    user,
    signOutUser,
  } = useFirebaseSession();
  const {
    status,
    loading: dataLoading,
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
    savingProfile,
    updatingBatch,
    updatingDailyLog,
    updatingListing,
    updatingListingStatus,
    updatingInquiryStatus,
    reviewingVerificationRequest,
    deletingBatch,
    deletingDailyLog,
    deletingListing,
    error,
    shopError,
    firebaseCheckResult,
    profile,
    linkedHatchPurchases,
    latestVerificationRequest,
    verificationReviewQueue,
    needsOnboarding,
    activeBatch,
    recentActiveBatchLog,
    activeBatchCandlingHistory,
    broodingGuidance,
    batches,
    reminders,
    marketplaceDrafts,
    shopCollection,
    publicMarketplaceListings,
    savedMarketplaceListingIds,
    listingInquiries,
    marketplaceMessages,
    setupChecklist,
    incubatorGuides,
    eggKnowledgeGuides,
    hatchAnalytics,
    linkedIncubatorGuides,
    reminderPreferences,
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
    runningFirebaseCheck,
    seedStarterData,
    seedingStarterData,
  } = useAppData();
  const {
    loading: reminderLoading,
    statusMessage: reminderStatusMessage,
    enableReminders,
    disableReminders,
  } = useBatchReminders();
  const daysLeft = useMemo(
    () => (activeBatch ? activeBatch.totalDays - activeBatch.currentDay : 0),
    [activeBatch],
  );
  const canManageBatches = Boolean(profile?.roles?.includes('farmer'));
  const canSellInMarketplace = Boolean(profile?.roles?.includes('farmer'));
  const badgeLabel = configured
    ? sessionLoading || dataLoading
      ? 'Connecting Firebase'
      : 'Firebase live'
    : 'Demo mode';
  const bootstrappingProfile = configured && (sessionLoading || (dataLoading && !profile));
  const firebaseBannerMessage = formatFirebaseBannerMessage(authError ?? error);

  if (bootstrappingProfile) {
    return (
      <View style={[styles.container, styles.centeredState]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.centeredStateTitle}>Preparing your hatch account</Text>
        <Text style={styles.centeredStateBody}>
          We are finishing the Firebase session and profile check before showing onboarding.
        </Text>
      </View>
    );
  }

  if (needsOnboarding) {
    return (
        <OnboardingScreen
          configured={configured}
          loading={savingProfile}
          onSaveProfile={saveProfile}
          onSkip={skipOnboarding}
        />
      );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLogo}>
          <Text style={styles.headerLogoEmoji}>🥚</Text>
        </View>
        <View style={styles.flexOne}>
          <Text style={styles.kicker}>MK Hatch Pilot</Text>
          <Text style={styles.title}>
            {activeTab === 'overview'
              ? profile?.fullName
                ? `Hi, ${profile.fullName.split(' ')[0]}`
                : 'Your hatch dashboard'
              : activeTab === 'batches'
                ? 'Your batches'
                : activeTab === 'marketplace'
                  ? 'Marketplace'
                  : 'Your account'}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {(!configured || sessionLoading || dataLoading || firebaseBannerMessage) ? (
          <View style={styles.infoBanner}>
            {(sessionLoading || dataLoading) ? <ActivityIndicator color={colors.primary} /> : null}
            <View style={styles.flexOne}>
              <Text style={styles.infoBannerTitle}>
                {!configured
                  ? 'Demo mode'
                  : sessionLoading || dataLoading
                    ? 'Connecting to Firebase'
                    : 'Firebase notice'}
              </Text>
              <Text style={styles.infoBannerText}>
                {!configured
                  ? 'Add your Expo public Firebase env values to switch from demo data to live account data.'
                  : firebaseBannerMessage ?? 'Preparing your account.'}
              </Text>
            </View>
          </View>
        ) : null}

        {activeTab === 'overview' ? (
          <OverviewTab
            canManageHatch={canManageBatches}
            daysLeft={daysLeft}
              activeBatch={activeBatch}
              activeBatchCandlingHistory={activeBatchCandlingHistory}
              broodingGuidance={broodingGuidance}
              creatingDailyLog={creatingDailyLog}
              creatingCandlingRecord={creatingCandlingRecord}
              completingHatch={completingHatch}
            updatingDailyLog={updatingDailyLog}
            deletingDailyLog={deletingDailyLog}
              onCreateDailyLog={createDailyLog}
              onCreateCandlingRecord={createCandlingRecord}
              onCompleteHatch={completeHatch}
            onUpdateDailyLog={updateDailyLog}
            onDeleteDailyLog={deleteDailyLog}
            onDisableReminders={disableReminders}
            onEnableReminders={enableReminders}
            onSaveReminderPreferences={saveReminderPreferences}
            reminderLoading={reminderLoading}
            reminderStatusMessage={reminderStatusMessage}
            reminderPreferences={reminderPreferences}
            recentActiveBatchLog={recentActiveBatchLog}
            reminders={reminders}
              setupChecklist={setupChecklist}
              incubatorGuides={incubatorGuides}
              linkedIncubatorGuides={linkedIncubatorGuides}
              eggKnowledgeGuides={eggKnowledgeGuides}
            shopCollection={shopCollection}
            shopError={shopError}
            shopLoading={shopLoading}
            status={status}
          />
        ) : null}
        {activeTab === 'batches' ? (
          <BatchesTab
            batches={batches}
            canManageBatches={canManageBatches}
            incubatorGuides={incubatorGuides}
            linkedIncubatorGuides={linkedIncubatorGuides}
            creatingBatch={creatingBatch}
            updatingBatch={updatingBatch}
            deletingBatch={deletingBatch}
            hatchAnalytics={hatchAnalytics}
            onCreateBatch={createBatch}
            onUpdateBatch={updateBatch}
            onDeleteBatch={deleteBatch}
            status={status}
          />
        ) : null}
        {activeTab === 'marketplace' ? (
          <MarketplaceTab
            activeBatch={activeBatch}
            canSell={canSellInMarketplace}
            creatingListing={creatingListing}
            creatingInquiry={creatingInquiry}
            savingSavedListingId={savingSavedListingId}
            sendingMarketplaceMessage={sendingMarketplaceMessage}
            updatingListing={updatingListing}
            updatingListingStatus={updatingListingStatus}
            updatingInquiryStatus={updatingInquiryStatus}
            deletingListing={deletingListing}
            buyerHomeLocation={profile?.location ?? ''}
            marketplaceDrafts={marketplaceDrafts}
            publicMarketplaceListings={publicMarketplaceListings}
            savedMarketplaceListingIds={savedMarketplaceListingIds}
            listingInquiries={listingInquiries}
            marketplaceMessages={marketplaceMessages}
            onCreateListing={createMarketplaceListing}
            onCreateInquiry={createListingInquiry}
            onToggleSavedListing={toggleSavedMarketplaceListing}
            onSendMarketplaceMessage={sendMarketplaceMessage}
            onUpdateListing={updateMarketplaceListing}
            onUpdateListingStatus={updateMarketplaceListingStatus}
            onUpdateInquiryStatus={updateListingInquiryStatus}
            onDeleteListing={deleteMarketplaceListing}
          />
        ) : null}
        {activeTab === 'profile' ? (
          <ProfileTab
            configured={configured}
            firebaseCheckResult={firebaseCheckResult}
            latestVerificationRequest={latestVerificationRequest}
            reviewQueue={verificationReviewQueue}
            onSaveProfile={saveProfile}
            onSubmitVerificationRequest={submitVerificationRequest}
            onReviewVerificationRequest={reviewSellerVerificationRequest}
            onRunFirebaseCheck={runFirebaseCheck}
            onSeedStarterData={seedStarterData}
            onSignOut={signOutUser}
            profile={profile}
            linkedHatchPurchases={linkedHatchPurchases}
            onFindLinkedHatchPurchases={findLinkedHatchPurchases}
            lookingUpHatchPurchases={lookingUpHatchPurchases}
            reviewingVerificationRequest={reviewingVerificationRequest}
            runningFirebaseCheck={runningFirebaseCheck}
            savingProfile={savingProfile}
            submittingVerificationRequest={submittingVerificationRequest}
            seedingStarterData={seedingStarterData}
            user={user}
          />
        ) : null}
      </ScrollView>

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const selected = tab.key === activeTab;

          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabButton, selected && styles.tabButtonActive]}
            >
              <Ionicons
                name={selected ? tab.iconActive : tab.icon}
                size={20}
                color={selected ? '#FFFFFF' : colors.mutedText}
              />
              <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function OnboardingScreen({
  configured,
  loading,
  onSaveProfile,
  onSkip,
}: {
  configured: boolean;
  loading: boolean;
  onSaveProfile: (input: FarmProfileInput) => Promise<void>;
  onSkip: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+263');
  const [location, setLocation] = useState('Harare');
  const [accountMode, setAccountMode] = useState<AccountMode>('both');
  const [experienceLevel, setExperienceLevel] =
    useState<'beginner' | 'growing' | 'advanced'>('beginner');
  const [marketplaceContactPreference, setMarketplaceContactPreference] =
    useState<ContactPreference>('phone');
  const isSellerFlow = accountMode === 'seller' || accountMode === 'both';

  async function handleSaveProfile() {
    if (!fullName.trim()) {
      Alert.alert('Name needed', 'Please add your name to set up your account profile.');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Location needed', 'Please add your location so buyers and sellers know your area.');
      return;
    }

    try {
      await onSaveProfile({
        fullName,
        farmName,
        phoneNumber,
        location,
        roles: accountModeToRoles(accountMode),
        experienceLevel: isSellerFlow ? experienceLevel : undefined,
        marketplaceContactPreference: isSellerFlow ? marketplaceContactPreference : undefined,
      });
    } catch {
      Alert.alert('Could not save profile', 'Please try again in a moment.');
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.onboardingContent} showsVerticalScrollIndicator={false}>
        <View style={styles.onboardingHero}>
          <Text style={styles.kicker}>MK Hatch Pilot</Text>
          <Text style={styles.onboardingTitle}>Set up your poultry home base</Text>
          <Text style={styles.onboardingSubtitle}>
            Choose whether you are here to buy, hatch and sell, or do both. We will shape the app around that.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account profile</Text>
          <Text style={styles.cardSubtitle}>
            {configured
              ? 'This will be saved to Firebase and follow you across devices.'
              : 'This will be saved locally in demo mode until Firebase is live.'}
          </Text>

          <LabeledField label="How will you use MK Hatch Pilot?">
            <View style={styles.choiceRow}>
              {([
                ['buyer', 'Buyer only'],
                ['seller', 'Hatcher only'],
                ['both', 'Buyer and hatcher'],
              ] as const).map(([value, label]) => {
                const selected = value === accountMode;

                return (
                  <Pressable
                    key={value}
                    onPress={() => setAccountMode(value)}
                    style={[styles.choiceChip, selected && styles.choiceChipActive]}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </LabeledField>

          <LabeledField label="Your full name">
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Tapiwa Moyo"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />
          </LabeledField>

          {isSellerFlow ? (
            <LabeledField label="Farm or business name">
              <TextInput
                value={farmName}
                onChangeText={setFarmName}
                placeholder="Sunrise Poultry Farm"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
              />
            </LabeledField>
          ) : null}

          <View style={styles.formRow}>
            <LabeledField label="Phone" style={styles.flexOne}>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+263..."
                placeholderTextColor={colors.mutedText}
                style={styles.input}
              />
            </LabeledField>
            <LabeledField label="Location" style={styles.flexOne}>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Harare"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
              />
            </LabeledField>
          </View>

          {isSellerFlow ? (
            <LabeledField label="Hatching experience">
              <View style={styles.choiceRow}>
                {([
                  ['beginner', 'Beginner'],
                  ['growing', 'Growing'],
                  ['advanced', 'Advanced'],
                ] as const).map(([value, label]) => {
                  const selected = value === experienceLevel;

                  return (
                    <Pressable
                      key={value}
                      onPress={() => setExperienceLevel(value)}
                      style={[styles.choiceChip, selected && styles.choiceChipActive]}
                    >
                      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </LabeledField>
          ) : null}

          {isSellerFlow ? (
            <LabeledField label="Buyer contact preference">
              <View style={styles.choiceRow}>
                {([
                  ['phone', 'Phone'],
                  ['in-app', 'In-app'],
                ] as const).map(([value, label]) => {
                  const selected = value === marketplaceContactPreference;

                  return (
                    <Pressable
                      key={value}
                      onPress={() => setMarketplaceContactPreference(value)}
                      style={[styles.choiceChip, selected && styles.choiceChipActive]}
                    >
                      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </LabeledField>
          ) : null}

          <Pressable
            onPress={handleSaveProfile}
            disabled={loading}
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Finish setup</Text>}
          </Pressable>
          <Pressable onPress={() => void onSkip()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Skip for now</Text>
          </Pressable>
          <Text style={styles.cardSubtitle}>
            You can keep using the app and fill these details later from the Profile tab.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function OverviewTab({
  canManageHatch,
  daysLeft,
  activeBatch,
  activeBatchCandlingHistory,
  broodingGuidance,
  creatingDailyLog,
  creatingCandlingRecord,
  completingHatch,
  updatingDailyLog,
  deletingDailyLog,
  onCreateDailyLog,
  onCreateCandlingRecord,
  onCompleteHatch,
  onUpdateDailyLog,
  onDeleteDailyLog,
  onDisableReminders,
  onEnableReminders,
  onSaveReminderPreferences,
  reminderLoading,
  reminderStatusMessage,
  reminderPreferences,
  recentActiveBatchLog,
  reminders,
  setupChecklist,
  incubatorGuides,
  linkedIncubatorGuides,
  eggKnowledgeGuides,
  shopCollection,
  shopError,
  shopLoading,
  status,
}: {
  canManageHatch: boolean;
  daysLeft: number;
  activeBatch: {
    name: string;
    eggType: string;
    incubatorName: string;
    currentDay: number;
    totalDays: number;
    fertileCount: number;
    targetTemp: string;
    targetHumidity: string;
    nextTask: string;
    id: string;
    startDate?: string;
    expectedHatchDate?: string;
    hatchedCount?: number;
    weakCount?: number;
    unhatchedCount?: number;
    hatchNotes?: string;
    completedAt?: string;
  } | null;
  creatingDailyLog: boolean;
  creatingCandlingRecord: boolean;
  completingHatch: string | null;
  updatingDailyLog: string | null;
  deletingDailyLog: string | null;
  onCreateDailyLog: (input: CreateDailyLogInput) => Promise<void>;
  onCreateCandlingRecord: (input: CreateCandlingRecordInput) => Promise<void>;
  onCompleteHatch: (input: CompleteHatchInput) => Promise<void>;
  onUpdateDailyLog: (input: UpdateDailyLogInput) => Promise<void>;
  onDeleteDailyLog: (logId: string) => Promise<void>;
  onDisableReminders: (batchId: string) => Promise<void>;
  onSaveReminderPreferences: (input: ReminderPreferences) => Promise<void>;
  onEnableReminders: (batch: {
    id: string;
    name: string;
    eggType: string;
    currentDay: number;
    totalDays: number;
    startDate?: string;
    expectedHatchDate?: string;
  }, preferences?: ReminderPreferences) => Promise<{ count: number; message: string } | void>;
  reminderLoading: boolean;
  reminderStatusMessage: string | null;
  reminderPreferences: ReminderPreferences;
  recentActiveBatchLog: {
    id: string;
    batchId: string;
    dayNumber: number;
    temperatureC: number;
    humidityPercent: number;
    eggsTurned: boolean;
    waterAdded: boolean;
    notes?: string;
    loggedAt: string;
  } | null;
  activeBatchCandlingHistory: Array<{
    id: string;
    batchId: string;
    dayNumber: number;
    fertileCount: number;
    clearCount: number;
    removedCount: number;
    notes?: string;
    eggFindings?: string[];
    createdAt: string;
  }>;
  broodingGuidance: {
    batchId: string;
    batchName: string;
    chickCount: number;
    firstWeekTemperature: string;
    secondWeekTemperature: string;
    waterPlan: string;
    feedPlan: string;
    floorPlan: string;
    watchouts: string[];
    dailyChecklist: Array<{
      dayRange: string;
      heat: string;
      tasks: string[];
    }>;
  } | null;
  reminders: DashboardReminder[];
  setupChecklist: string[];
  incubatorGuides: Array<{
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
  }>;
  linkedIncubatorGuides: Array<{
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
  }>;
  eggKnowledgeGuides: Array<{
    eggType: string;
    totalDays: number;
    temperature: string;
    humidity: string;
    lockdownDay: string;
    turning: string;
    careTip: string;
  }>;
  shopCollection: {
    collection: {
      name: string;
      url: string;
    };
    items: Array<{
      id: string;
      title: string;
      description: string;
      price: number;
      currency: 'USD';
      imageUrl?: string | null;
      productUrl: string;
    }>;
  };
  shopError: string | null;
  shopLoading: boolean;
  status: 'demo' | 'live';
}) {
  const [selectedGuideId, setSelectedGuideId] = useState(incubatorGuides[0]?.id ?? '');
  const [selectedEggType, setSelectedEggType] = useState(eggKnowledgeGuides[0]?.eggType ?? 'Chicken');
  const selectedGuide =
    incubatorGuides.find((guide) => guide.id === selectedGuideId) ?? incubatorGuides[0] ?? null;
  const selectedEggGuide =
    eggKnowledgeGuides.find((guide) => guide.eggType === selectedEggType) ??
    eggKnowledgeGuides[0] ??
    null;
  const [temperature, setTemperature] = useState(
    String(activeBatch?.targetTemp ?? '37.5 C').replace(' C', ''),
  );
  const [humidity, setHumidity] = useState(
    String(activeBatch?.targetHumidity ?? '45-55%').split('-')[0].replace('%', ''),
  );
  const [notes, setNotes] = useState('');
  const [eggsTurned, setEggsTurned] = useState(true);
  const [waterAdded, setWaterAdded] = useState(true);
  const [editingLog, setEditingLog] = useState(false);
  const [editingTemperature, setEditingTemperature] = useState('');
  const [editingHumidity, setEditingHumidity] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [editingEggsTurned, setEditingEggsTurned] = useState(true);
  const [editingWaterAdded, setEditingWaterAdded] = useState(true);
  const [showHatchSummaryForm, setShowHatchSummaryForm] = useState(false);
  const [hatchedCount, setHatchedCount] = useState('');
  const [weakCount, setWeakCount] = useState('0');
  const [unhatchedCount, setUnhatchedCount] = useState('');
  const [hatchNotes, setHatchNotes] = useState('');
  const [candlingFertile, setCandlingFertile] = useState(String(activeBatch?.fertileCount ?? 0));
  const [candlingClears, setCandlingClears] = useState('0');
  const [candlingRemoved, setCandlingRemoved] = useState('0');
  const [candlingNotes, setCandlingNotes] = useState('');
  const [candlingEggFindings, setCandlingEggFindings] = useState('');
  const [dailyLogHour, setDailyLogHour] = useState(String(reminderPreferences.dailyLogHour));
  const [turningHour, setTurningHour] = useState(String(reminderPreferences.turningHour));
  const [lockdownHour, setLockdownHour] = useState(String(reminderPreferences.lockdownHour));
  const [hatchHour, setHatchHour] = useState(String(reminderPreferences.hatchHour));

  async function handleCreateDailyLog() {
    if (!activeBatch) {
      Alert.alert('No active batch', 'Create a hatch batch first before logging daily readings.');
      return;
    }

    const temperatureC = Number(temperature);
    const humidityPercent = Number(humidity);

    if (!Number.isFinite(temperatureC) || temperatureC <= 0) {
      Alert.alert('Invalid temperature', 'Enter a valid temperature in Celsius.');
      return;
    }

    if (!Number.isFinite(humidityPercent) || humidityPercent <= 0) {
      Alert.alert('Invalid humidity', 'Enter a valid humidity percentage.');
      return;
    }

    try {
      await onCreateDailyLog({
        batchId: activeBatch.id,
        dayNumber: activeBatch.currentDay,
        temperatureC,
        humidityPercent,
        eggsTurned,
        waterAdded,
        notes,
      });

      setNotes('');
      Alert.alert(
        'Daily log saved',
        status === 'live'
          ? 'Today’s readings were saved to Firebase.'
          : 'Today’s readings were saved in demo mode.',
      );
    } catch {
      Alert.alert('Could not save log', 'Please check your Firebase setup and try again.');
    }
  }

  async function handleDeleteDailyLog() {
    if (!recentActiveBatchLog) {
      return;
    }

    try {
      await onDeleteDailyLog(recentActiveBatchLog.id);
      Alert.alert('Daily log deleted', 'The latest reading was removed.');
    } catch {
      Alert.alert('Could not delete log', 'Please try again.');
    }
  }

  function startEditingLatestLog() {
    if (!recentActiveBatchLog) {
      return;
    }

    setEditingTemperature(String(recentActiveBatchLog.temperatureC));
    setEditingHumidity(String(recentActiveBatchLog.humidityPercent));
    setEditingNotes(recentActiveBatchLog.notes ?? '');
    setEditingEggsTurned(recentActiveBatchLog.eggsTurned);
    setEditingWaterAdded(recentActiveBatchLog.waterAdded);
    setEditingLog(true);
  }

  async function handleUpdateDailyLog() {
    if (!recentActiveBatchLog) {
      return;
    }

    const temperatureC = Number(editingTemperature);
    const humidityPercent = Number(editingHumidity);

    if (!Number.isFinite(temperatureC) || temperatureC <= 0) {
      Alert.alert('Invalid temperature', 'Enter a valid temperature in Celsius.');
      return;
    }

    if (!Number.isFinite(humidityPercent) || humidityPercent <= 0) {
      Alert.alert('Invalid humidity', 'Enter a valid humidity percentage.');
      return;
    }

    try {
      await onUpdateDailyLog({
        logId: recentActiveBatchLog.id,
        batchId: recentActiveBatchLog.batchId,
        dayNumber: recentActiveBatchLog.dayNumber,
        temperatureC,
        humidityPercent,
        eggsTurned: editingEggsTurned,
        waterAdded: editingWaterAdded,
        notes: editingNotes,
      });
      setEditingLog(false);
      Alert.alert('Daily log updated', 'The latest reading was updated successfully.');
    } catch {
      Alert.alert('Could not update log', 'Please try again.');
    }
  }

  async function handleEnableReminders() {
    if (!activeBatch) {
      return;
    }

    try {
      const result = await onEnableReminders(activeBatch, {
        ...reminderPreferences,
        dailyLogHour: Number(dailyLogHour),
        turningHour: Number(turningHour),
        lockdownHour: Number(lockdownHour),
        hatchHour: Number(hatchHour),
      });
      Alert.alert('Reminders enabled', result?.message ?? 'Batch reminders were scheduled.');
    } catch (reminderError) {
      Alert.alert(
        'Could not enable reminders',
        reminderError instanceof Error ? reminderError.message : 'Please try again on a physical device.',
      );
    }
  }

  async function handleSaveReminderPreferences() {
    const nextPreferences = {
      enabled: reminderPreferences.enabled,
      dailyLogHour: Number(dailyLogHour),
      turningHour: Number(turningHour),
      lockdownHour: Number(lockdownHour),
      hatchHour: Number(hatchHour),
    };

    if (
      Object.values(nextPreferences).some(
        (value) => typeof value === 'number' && (!Number.isFinite(value) || value < 0 || value > 23),
      )
    ) {
      Alert.alert('Invalid reminder hours', 'Use whole hours between 0 and 23.');
      return;
    }

    try {
      await onSaveReminderPreferences(nextPreferences);
      Alert.alert('Reminder plan saved', 'Your reminder schedule is now synced with your account.');
    } catch {
      Alert.alert('Could not save reminders', 'Please try again.');
    }
  }

  async function handleDisableReminders() {
    if (!activeBatch) {
      return;
    }

    try {
      await onDisableReminders(activeBatch.id);
      Alert.alert('Reminders cancelled', 'Scheduled reminders for this batch were removed.');
    } catch {
      Alert.alert('Could not cancel reminders', 'Please try again.');
    }
  }

  async function handleCreateCandlingRecord() {
    if (!activeBatch) {
      Alert.alert('No active batch', 'Create a hatch batch first before saving candling results.');
      return;
    }

    const fertileCount = Number(candlingFertile);
    const clearCount = Number(candlingClears);
    const removedCount = Number(candlingRemoved);

    if ([fertileCount, clearCount, removedCount].some((value) => !Number.isFinite(value) || value < 0)) {
      Alert.alert('Invalid candling counts', 'Use non-negative numbers for candling results.');
      return;
    }

    try {
      await onCreateCandlingRecord({
        batchId: activeBatch.id,
        dayNumber: activeBatch.currentDay,
        fertileCount,
        clearCount,
        removedCount,
        notes: candlingNotes,
        eggFindings: candlingEggFindings
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      });
      setCandlingClears('0');
      setCandlingRemoved('0');
      setCandlingNotes('');
      setCandlingEggFindings('');
      Alert.alert('Candling saved', 'Your candling results are now part of this hatch record.');
    } catch {
      Alert.alert('Could not save candling', 'Please try again.');
    }
  }

  function beginHatchSummary() {
    if (!activeBatch) {
      return;
    }

    setHatchedCount(String(activeBatch.hatchedCount ?? ''));
    setWeakCount(String(activeBatch.weakCount ?? 0));
    setUnhatchedCount(
      String(
        activeBatch.unhatchedCount ??
          Math.max(0, activeBatch.fertileCount - (activeBatch.hatchedCount ?? 0) - (activeBatch.weakCount ?? 0)),
      ),
    );
    setHatchNotes(activeBatch.hatchNotes ?? '');
    setShowHatchSummaryForm(true);
  }

  async function handleCompleteHatch() {
    if (!activeBatch) {
      return;
    }

    const parsedHatched = Number(hatchedCount);
    const parsedWeak = Number(weakCount);
    const parsedUnhatched = Number(unhatchedCount);

    if ([parsedHatched, parsedWeak, parsedUnhatched].some((value) => !Number.isFinite(value) || value < 0)) {
      Alert.alert('Invalid hatch results', 'Use non-negative numbers for hatch results.');
      return;
    }

    try {
      await onCompleteHatch({
        batchId: activeBatch.id,
        hatchedCount: parsedHatched,
        weakCount: parsedWeak,
        unhatchedCount: parsedUnhatched,
        hatchNotes,
      });
      setShowHatchSummaryForm(false);
      Alert.alert('Hatch saved', 'The hatch summary is now ready for marketplace handoff.');
    } catch {
      Alert.alert('Could not save hatch', 'Please try again.');
    }
  }

  async function handleOpenStoreLink(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open store', 'Please try again in a moment.');
    }
  }

  if (!canManageHatch) {
    return (
      <View style={styles.sectionStack}>
        <SectionTitle
          title="Buyer home"
          subtitle="Browse poultry listings, contact sellers carefully, and stay safe when trading offline."
        />
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How buyers use MK Hatch Pilot</Text>
          <Text style={styles.listText}>Browse live chick, egg, bird, and equipment listings in the Market tab.</Text>
          <Text style={styles.listText}>Use cash on delivery or another trusted local payment method.</Text>
          <Text style={styles.listText}>Prefer verified sellers and inspect stock before paying.</Text>
          <Text style={styles.listText}>
            If you later start hatching too, switch your account type in Profile and the hatch tools will open up.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Popular incubators from MeekyCart</Text>
          <Text style={styles.cardSubtitle}>
            Buyers and future hatchers can still learn the setup flow before owning a machine.
          </Text>
          <View style={styles.choiceRow}>
            {incubatorGuides.map((guide) => {
              const selected = guide.id === selectedGuide?.id;

              return (
                <Pressable
                  key={guide.id}
                  onPress={() => setSelectedGuideId(guide.id)}
                  style={[styles.choiceChip, selected && styles.choiceChipActive]}
                >
                  <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                    {guide.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selectedGuide ? (
            <View style={styles.infoResultCard}>
              <Text style={styles.fieldLabel}>{selectedGuide.capacityLabel}</Text>
              <Text style={styles.listText}>Best for: {selectedGuide.bestFor}</Text>
              <Text style={styles.listText}>Water: {selectedGuide.waterGuide}</Text>
              <Text style={styles.listText}>Power: {selectedGuide.powerGuide}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Egg and bird knowledge library</Text>
          <Text style={styles.cardSubtitle}>
            Learn the basics before buying chicks, fertile eggs, or your first incubator.
          </Text>
          <View style={styles.choiceRow}>
            {eggKnowledgeGuides.map((guide) => {
              const selected = guide.eggType === selectedEggGuide?.eggType;

              return (
                <Pressable
                  key={guide.eggType}
                  onPress={() => setSelectedEggType(guide.eggType)}
                  style={[styles.choiceChip, selected && styles.choiceChipActive]}
                >
                  <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                    {guide.eggType}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selectedEggGuide ? (
            <View style={styles.infoResultCard}>
              <Text style={styles.listText}>Incubation: {selectedEggGuide.totalDays} days</Text>
              <Text style={styles.listText}>Temperature: {selectedEggGuide.temperature}</Text>
              <Text style={styles.listText}>Humidity: {selectedEggGuide.humidity}</Text>
              <Text style={styles.listText}>Lockdown starts: {selectedEggGuide.lockdownDay}</Text>
              <Text style={styles.listText}>Turning: {selectedEggGuide.turning}</Text>
              <Text style={styles.listText}>Care tip: {selectedEggGuide.careTip}</Text>
            </View>
          ) : null}
        </View>
        <ShopHatchGearSection
          loading={shopLoading}
          error={shopError}
          collectionName={shopCollection.collection.name}
          collectionUrl={shopCollection.collection.url}
          items={shopCollection.items}
          onOpenUrl={handleOpenStoreLink}
        />
      </View>
    );
  }

  return (
    <View style={styles.sectionStack}>
      {activeBatch ? (
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Active batch</Text>
          <Text style={styles.heroTitle}>{activeBatch.name}</Text>
          <Text style={styles.heroSubtitle}>
            {activeBatch.eggType} eggs in {activeBatch.incubatorName}
          </Text>

          <View style={styles.heroMetrics}>
            <MetricCard label="Day" value={`${activeBatch.currentDay}/${activeBatch.totalDays}`} />
            <MetricCard label="Days left" value={`${daysLeft}`} />
            <MetricCard label="Fertile" value={`${activeBatch.fertileCount}`} />
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, Math.round((activeBatch.currentDay / activeBatch.totalDays) * 100))}%`,
                },
              ]}
            />
          </View>

          <View style={styles.actionStrip}>
            <MiniAction label={`Temp ${activeBatch.targetTemp}`} />
            <MiniAction label={`Humidity ${activeBatch.targetHumidity}`} />
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeLabel}>Next action</Text>
            <Text style={styles.noticeText}>{activeBatch.nextTask}</Text>
          </View>
          <Pressable onPress={beginHatchSummary} style={styles.heroButton}>
            <Text style={styles.heroButtonText}>
              {activeBatch.completedAt ? 'Update hatch summary' : 'Complete hatch summary'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <EmptyStateCard
          title="No active batch yet"
          body="Create your first hatch batch in the Batches tab and the daily dashboard will come alive here."
        />
      )}

      {linkedIncubatorGuides.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Linked MeekyCart setup</Text>
          <Text style={styles.cardSubtitle}>
            These setup guides were matched from hatch gear you already bought on MeekyCart.
          </Text>
          {linkedIncubatorGuides.map((guide) => (
            <View key={`linked-${guide.id}`} style={styles.infoResultCard}>
              <Text style={styles.cardTitle}>{guide.name}</Text>
              <Text style={styles.cardSubtitle}>
                {guide.capacityLabel} • {guide.bestFor}
              </Text>
              <Text style={styles.listText}>Water: {guide.waterGuide}</Text>
              <Text style={styles.listText}>Power: {guide.powerGuide}</Text>
              {guide.setupSteps.slice(0, 2).map((step) => (
                <Text key={step} style={styles.listText}>
                  • {step}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      <SectionTitle
        title="What to do today"
        subtitle={
          status === 'live'
            ? 'This view is ready to pull daily tasks from your real Firebase data.'
            : 'Keep the app practical and low-friction for repeat use.'
        }
      />
      <View style={styles.card}>
        {reminders.map((reminder) => (
          <View key={reminder.id} style={styles.listRow}>
            <View style={styles.dot} />
            <Text style={styles.listText}>{reminder.message}</Text>
          </View>
        ))}
      </View>

      {activeBatch ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reminder controls</Text>
          <Text style={styles.cardSubtitle}>
            Sync the reminder plan to your account, then schedule notifications for this batch.
          </Text>
          <View style={styles.formRow}>
            <LabeledField label="Daily log hour" style={styles.flexOne}>
              <TextInput
                value={dailyLogHour}
                onChangeText={setDailyLogHour}
                keyboardType="number-pad"
                placeholder="7"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
              />
            </LabeledField>
            <LabeledField label="Turning hour" style={styles.flexOne}>
              <TextInput
                value={turningHour}
                onChangeText={setTurningHour}
                keyboardType="number-pad"
                placeholder="13"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
              />
            </LabeledField>
          </View>
          <View style={styles.formRow}>
            <LabeledField label="Lockdown hour" style={styles.flexOne}>
              <TextInput
                value={lockdownHour}
                onChangeText={setLockdownHour}
                keyboardType="number-pad"
                placeholder="9"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
              />
            </LabeledField>
            <LabeledField label="Hatch hour" style={styles.flexOne}>
              <TextInput
                value={hatchHour}
                onChangeText={setHatchHour}
                keyboardType="number-pad"
                placeholder="8"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
              />
            </LabeledField>
          </View>
          <Pressable onPress={handleSaveReminderPreferences} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Save reminder schedule</Text>
          </Pressable>
          <Pressable
            onPress={handleEnableReminders}
            disabled={reminderLoading}
            style={[styles.primaryButton, reminderLoading && styles.primaryButtonDisabled]}
          >
            {reminderLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Enable batch reminders</Text>
            )}
          </Pressable>
          <Pressable
            onPress={handleDisableReminders}
            disabled={reminderLoading}
            style={[styles.secondaryButton, reminderLoading && styles.primaryButtonDisabled]}
          >
            <Text style={styles.secondaryButtonText}>Cancel batch reminders</Text>
          </Pressable>
          {reminderStatusMessage ? (
            <View style={styles.infoResultCard}>
              <Text style={styles.fieldLabel}>Reminder status</Text>
              <Text style={styles.listText}>{reminderStatusMessage}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <SectionTitle
        title="Log today"
        subtitle="Capture the daily incubation readings that drive hatch success."
      />
      {activeBatch ? (
        <View style={styles.card}>
          <View style={styles.formRow}>
            <LabeledField label="Temperature C" style={styles.flexOne}>
              <TextInput
                value={temperature}
                onChangeText={setTemperature}
                keyboardType="decimal-pad"
                placeholder="37.5"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
              />
            </LabeledField>

            <LabeledField label="Humidity %" style={styles.flexOne}>
              <TextInput
                value={humidity}
                onChangeText={setHumidity}
                keyboardType="number-pad"
                placeholder="52"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
              />
            </LabeledField>
          </View>

          <View style={styles.choiceRow}>
            <ToggleChip
              label={eggsTurned ? 'Eggs turned' : 'Mark eggs turned'}
              selected={eggsTurned}
              onPress={() => setEggsTurned((current) => !current)}
            />
            <ToggleChip
              label={waterAdded ? 'Water added' : 'Mark water added'}
              selected={waterAdded}
              onPress={() => setWaterAdded((current) => !current)}
            />
          </View>

          <LabeledField label="Notes">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything unusual today?"
              placeholderTextColor={colors.mutedText}
              style={[styles.input, styles.multilineInput]}
              multiline
            />
          </LabeledField>

          <Pressable
            onPress={handleCreateDailyLog}
            disabled={creatingDailyLog}
            style={[styles.primaryButton, creatingDailyLog && styles.primaryButtonDisabled]}
          >
            {creatingDailyLog ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Save daily log</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {recentActiveBatchLog ? (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.flexOne}>
              <Text style={styles.cardTitle}>Latest reading</Text>
              <Text style={styles.cardSubtitle}>
                Day {recentActiveBatchLog.dayNumber} • {new Date(recentActiveBatchLog.loggedAt).toLocaleString()}
              </Text>
            </View>
            {!editingLog ? (
              <Pressable onPress={startEditingLatestLog} style={styles.linkButton}>
                <Text style={styles.linkButtonText}>Edit</Text>
              </Pressable>
            ) : null}
          </View>

          {editingLog ? (
            <>
              <View style={styles.formRow}>
                <LabeledField label="Temperature C" style={styles.flexOne}>
                  <TextInput
                    value={editingTemperature}
                    onChangeText={setEditingTemperature}
                    keyboardType="decimal-pad"
                    placeholder="37.5"
                    placeholderTextColor={colors.mutedText}
                    style={styles.input}
                  />
                </LabeledField>
                <LabeledField label="Humidity %" style={styles.flexOne}>
                  <TextInput
                    value={editingHumidity}
                    onChangeText={setEditingHumidity}
                    keyboardType="number-pad"
                    placeholder="52"
                    placeholderTextColor={colors.mutedText}
                    style={styles.input}
                  />
                </LabeledField>
              </View>
              <View style={styles.choiceRow}>
                <ToggleChip
                  label={editingEggsTurned ? 'Eggs turned' : 'Mark eggs turned'}
                  selected={editingEggsTurned}
                  onPress={() => setEditingEggsTurned((current) => !current)}
                />
                <ToggleChip
                  label={editingWaterAdded ? 'Water added' : 'Mark water added'}
                  selected={editingWaterAdded}
                  onPress={() => setEditingWaterAdded((current) => !current)}
                />
              </View>
              <LabeledField label="Notes">
                <TextInput
                  value={editingNotes}
                  onChangeText={setEditingNotes}
                  placeholder="Anything unusual today?"
                  placeholderTextColor={colors.mutedText}
                  style={[styles.input, styles.multilineInput]}
                  multiline
                />
              </LabeledField>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleUpdateDailyLog}
                  disabled={updatingDailyLog === recentActiveBatchLog.id}
                  style={[
                    styles.primaryButton,
                    styles.flexOne,
                    updatingDailyLog === recentActiveBatchLog.id && styles.primaryButtonDisabled,
                  ]}
                >
                  {updatingDailyLog === recentActiveBatchLog.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save changes</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setEditingLog(false)}
                  style={[styles.secondaryButton, styles.flexOne]}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.heroMetrics}>
                <MetricCard label="Temp" value={`${recentActiveBatchLog.temperatureC} C`} />
                <MetricCard label="Humidity" value={`${recentActiveBatchLog.humidityPercent}%`} />
                <MetricCard
                  label="Turned"
                  value={recentActiveBatchLog.eggsTurned ? 'Yes' : 'No'}
                />
              </View>
              <Text style={styles.listText}>
                Water added: {recentActiveBatchLog.waterAdded ? 'Yes' : 'No'}
                {recentActiveBatchLog.notes ? ` • ${recentActiveBatchLog.notes}` : ''}
              </Text>
            </>
          )}

          <Pressable
            onPress={handleDeleteDailyLog}
            disabled={deletingDailyLog === recentActiveBatchLog.id}
            style={[styles.dangerButton, deletingDailyLog === recentActiveBatchLog.id && styles.primaryButtonDisabled]}
          >
            {deletingDailyLog === recentActiveBatchLog.id ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Delete latest log</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {activeBatch ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Candling tracker</Text>
          <Text style={styles.cardSubtitle}>
            Record what you saw during candling so fertility and removals become part of the batch history.
          </Text>
          <View style={styles.formRow}>
            <LabeledField label="Fertile" style={styles.flexOne}>
              <TextInput
                value={candlingFertile}
                onChangeText={setCandlingFertile}
                keyboardType="number-pad"
                placeholder="40"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
              />
            </LabeledField>
            <LabeledField label="Clears" style={styles.flexOne}>
              <TextInput
                value={candlingClears}
                onChangeText={setCandlingClears}
                keyboardType="number-pad"
                placeholder="2"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
              />
            </LabeledField>
            <LabeledField label="Removed" style={styles.flexOne}>
              <TextInput
                value={candlingRemoved}
                onChangeText={setCandlingRemoved}
                keyboardType="number-pad"
                placeholder="2"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
              />
            </LabeledField>
          </View>
          <LabeledField label={`Candling notes for day ${activeBatch.currentDay}`}>
            <TextInput
              value={candlingNotes}
              onChangeText={setCandlingNotes}
              placeholder="Air cells strong, removed clears, one doubtful egg left in."
              placeholderTextColor={colors.mutedText}
              style={[styles.input, styles.multilineInput]}
              multiline
            />
          </LabeledField>
          <LabeledField label="Egg-by-egg findings">
            <TextInput
              value={candlingEggFindings}
              onChangeText={setCandlingEggFindings}
              placeholder={"Egg 04 clear\nEgg 11 blood ring\nEgg 18 still developing"}
              placeholderTextColor={colors.mutedText}
              style={[styles.input, styles.multilineInput]}
              multiline
            />
          </LabeledField>
          <Pressable
            onPress={handleCreateCandlingRecord}
            disabled={creatingCandlingRecord}
            style={[styles.primaryButton, creatingCandlingRecord && styles.primaryButtonDisabled]}
          >
            {creatingCandlingRecord ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Save candling record</Text>
            )}
          </Pressable>
          {activeBatchCandlingHistory.length > 0 ? (
            <View style={styles.sectionStackTight}>
              {activeBatchCandlingHistory.slice(0, 3).map((record) => (
                <View key={record.id} style={styles.infoResultCard}>
                  <Text style={styles.cardTitle}>Day {record.dayNumber} candling</Text>
                  <Text style={styles.cardSubtitle}>
                    {new Date(record.createdAt).toLocaleString()}
                  </Text>
                  <Text style={styles.listText}>
                    Fertile {record.fertileCount} • Clears {record.clearCount} • Removed {record.removedCount}
                  </Text>
                  {record.notes ? <Text style={styles.listText}>{record.notes}</Text> : null}
                  {record.eggFindings?.map((finding) => (
                    <Text key={finding} style={styles.listText}>
                      • {finding}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {activeBatch ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Post-hatch summary</Text>
          <Text style={styles.cardSubtitle}>
            Capture the hatch outcome so the app can track performance and prepare chicks for sale.
          </Text>
          {showHatchSummaryForm ? (
            <>
              <View style={styles.formRow}>
                <LabeledField label="Healthy chicks" style={styles.flexOne}>
                  <TextInput
                    value={hatchedCount}
                    onChangeText={setHatchedCount}
                    keyboardType="number-pad"
                    placeholder="18"
                    placeholderTextColor={colors.mutedText}
                    style={styles.input}
                  />
                </LabeledField>
                <LabeledField label="Weak chicks" style={styles.flexOne}>
                  <TextInput
                    value={weakCount}
                    onChangeText={setWeakCount}
                    keyboardType="number-pad"
                    placeholder="2"
                    placeholderTextColor={colors.mutedText}
                    style={styles.input}
                  />
                </LabeledField>
              </View>
              <LabeledField label="Unhatched eggs">
                <TextInput
                  value={unhatchedCount}
                  onChangeText={setUnhatchedCount}
                  keyboardType="number-pad"
                  placeholder="4"
                  placeholderTextColor={colors.mutedText}
                  style={styles.input}
                />
              </LabeledField>
              <LabeledField label="Hatch notes">
                <TextInput
                  value={hatchNotes}
                  onChangeText={setHatchNotes}
                  placeholder="Any lessons, losses, or brooding notes?"
                  placeholderTextColor={colors.mutedText}
                  style={[styles.input, styles.multilineInput]}
                  multiline
                />
              </LabeledField>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleCompleteHatch}
                  disabled={completingHatch === activeBatch.id}
                  style={[
                    styles.primaryButton,
                    styles.flexOne,
                    completingHatch === activeBatch.id && styles.primaryButtonDisabled,
                  ]}
                >
                  {completingHatch === activeBatch.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save hatch results</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setShowHatchSummaryForm(false)}
                  style={[styles.secondaryButton, styles.flexOne]}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.heroMetrics}>
                <MetricCard label="Healthy" value={`${activeBatch.hatchedCount ?? 0}`} />
                <MetricCard label="Weak" value={`${activeBatch.weakCount ?? 0}`} />
                <MetricCard label="Unhatched" value={`${activeBatch.unhatchedCount ?? 0}`} />
              </View>
              <Text style={styles.listText}>
                {activeBatch.hatchNotes
                  ? activeBatch.hatchNotes
                  : 'No hatch summary saved yet. Record the outcome as soon as the hatch is done.'}
              </Text>
            </>
          )}
        </View>
      ) : null}

      {broodingGuidance ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Brooding care plan</Text>
          <Text style={styles.cardSubtitle}>
            Follow this first-stage chick care plan for {broodingGuidance.batchName}.
          </Text>
          <View style={styles.heroMetrics}>
            <MetricCard label="Chicks" value={`${broodingGuidance.chickCount}`} />
            <MetricCard label="Week 1" value={broodingGuidance.firstWeekTemperature} />
          </View>
          <Text style={styles.listText}>Week 2 heat: {broodingGuidance.secondWeekTemperature}</Text>
          <Text style={styles.listText}>Floor setup: {broodingGuidance.floorPlan}</Text>
          <Text style={styles.listText}>Water: {broodingGuidance.waterPlan}</Text>
          <Text style={styles.listText}>Feed: {broodingGuidance.feedPlan}</Text>
          {broodingGuidance.dailyChecklist.map((phase) => (
            <View key={phase.dayRange} style={styles.infoResultCard}>
              <Text style={styles.fieldLabel}>{phase.dayRange}</Text>
              <Text style={styles.listText}>{phase.heat}</Text>
              {phase.tasks.map((task) => (
                <Text key={task} style={styles.listText}>
                  • {task}
                </Text>
              ))}
            </View>
          ))}
          {broodingGuidance.watchouts.map((warning: string) => (
            <Text key={warning} style={styles.listText}>
              • {warning}
            </Text>
          ))}
        </View>
      ) : null}

      <SectionTitle title="Setup wizard" subtitle="New incubator buyers get guided confidence before loading eggs." />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>MeekyCart incubator models</Text>
        <Text style={styles.cardSubtitle}>
          Pick your incubator model and follow the setup notes that match that machine.
        </Text>
        <View style={styles.choiceRow}>
          {incubatorGuides.map((guide) => {
            const selected = guide.id === selectedGuide?.id;

            return (
              <Pressable
                key={guide.id}
                onPress={() => setSelectedGuideId(guide.id)}
                style={[styles.choiceChip, selected && styles.choiceChipActive]}
              >
                <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                  {guide.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {selectedGuide ? (
          <View style={styles.infoResultCard}>
            <Text style={styles.fieldLabel}>{selectedGuide.capacityLabel}</Text>
            <Text style={styles.listText}>Best for: {selectedGuide.bestFor}</Text>
            {selectedGuide.preheatHours ? (
              <Text style={styles.listText}>Preheat: {selectedGuide.preheatHours}</Text>
            ) : null}
            {selectedGuide.roomPlacement ? (
              <Text style={styles.listText}>Placement: {selectedGuide.roomPlacement}</Text>
            ) : null}
            <Text style={styles.listText}>Water: {selectedGuide.waterGuide}</Text>
            <Text style={styles.listText}>Power: {selectedGuide.powerGuide}</Text>
            {selectedGuide.starterAccessories?.length ? (
              <Text style={styles.listText}>
                Starter kit: {selectedGuide.starterAccessories.join(', ')}
              </Text>
            ) : null}
            {selectedGuide.warningTips?.map((tip) => (
              <Text key={tip} style={styles.listText}>
                • {tip}
              </Text>
            ))}
          </View>
        ) : null}
        {setupChecklist.map((item) => (
          <View key={item} style={styles.checklistRow}>
            <Text style={styles.checkMark}>✓</Text>
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
        {selectedGuide?.setupSteps.map((item) => (
          <View key={item} style={styles.checklistRow}>
            <Text style={styles.checkMark}>•</Text>
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>

      <SectionTitle
        title="Knowledge library"
        subtitle="Quick incubation guides for the bird types farmers commonly hatch."
      />
      <View style={styles.card}>
        <View style={styles.choiceRow}>
          {eggKnowledgeGuides.map((guide) => {
            const selected = guide.eggType === selectedEggGuide?.eggType;

            return (
              <Pressable
                key={guide.eggType}
                onPress={() => setSelectedEggType(guide.eggType)}
                style={[styles.choiceChip, selected && styles.choiceChipActive]}
              >
                <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                  {guide.eggType}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {selectedEggGuide ? (
          <>
            <View style={styles.heroMetrics}>
              <MetricCard label="Days" value={`${selectedEggGuide.totalDays}`} />
              <MetricCard label="Temp" value={selectedEggGuide.temperature} />
              <MetricCard label="Lockdown" value={selectedEggGuide.lockdownDay} />
            </View>
            <Text style={styles.listText}>Humidity: {selectedEggGuide.humidity}</Text>
            <Text style={styles.listText}>Turning: {selectedEggGuide.turning}</Text>
            <Text style={styles.listText}>Care tip: {selectedEggGuide.careTip}</Text>
          </>
        ) : null}
      </View>

      <SectionTitle title="Marketplace handoff" subtitle="The same app should help users sell once chicks hatch." />
      <View style={[styles.card, styles.marketplaceCard]}>
        <Text style={styles.marketplaceTitle}>Turn hatch results into listings</Text>
        <Text style={styles.marketplaceText}>
          When the hatch is complete, the app can prefill a listing with chick type, quantity,
          hatch date, location, and asking price.
        </Text>
      </View>

      <ShopHatchGearSection
        loading={shopLoading}
        error={shopError}
        collectionName={shopCollection.collection.name}
        collectionUrl={shopCollection.collection.url}
        items={shopCollection.items}
        onOpenUrl={handleOpenStoreLink}
      />
    </View>
  );
}

function BatchesTab({
  batches,
  canManageBatches,
  incubatorGuides,
  linkedIncubatorGuides,
  creatingBatch,
  updatingBatch,
  deletingBatch,
  hatchAnalytics,
  onCreateBatch,
  onUpdateBatch,
  onDeleteBatch,
  status,
  }: {
  batches: Array<{
    id: string;
    name: string;
    eggType: string;
    quantity: number;
    incubatorName: string;
    stage: string;
    currentDay: number;
    totalDays: number;
    targetTemp: string;
    targetHumidity: string;
    nextTask: string;
    startDate?: string;
    hatchedCount?: number;
    weakCount?: number;
    unhatchedCount?: number;
    completedAt?: string;
  }>;
  canManageBatches: boolean;
  incubatorGuides: Array<{
    id: string;
    name: string;
    capacityLabel: string;
    bestFor: string;
    preheatHours?: string;
    roomPlacement?: string;
    starterAccessories?: string[];
    warningTips?: string[];
    setupSteps?: string[];
  }>;
  linkedIncubatorGuides: Array<{
    id: string;
    name: string;
    capacityLabel: string;
    bestFor: string;
    preheatHours?: string;
    roomPlacement?: string;
    starterAccessories?: string[];
    warningTips?: string[];
    setupSteps?: string[];
  }>;
  creatingBatch: boolean;
  updatingBatch: string | null;
  deletingBatch: string | null;
  hatchAnalytics: {
    totalWeak: number;
    totalUnhatched: number;
    lossRate: number;
    batchesReadyForSale: number;
    potentialChickRevenue: number;
    bestBatchName: string | null;
    bestBatchRate: number | null;
    topEggType: string | null;
    topEggTypeRate: number | null;
    topIncubatorName: string | null;
    topIncubatorRate: number | null;
  };
  onCreateBatch: (input: CreateBatchInput) => Promise<void>;
  onUpdateBatch: (input: UpdateBatchInput) => Promise<void>;
  onDeleteBatch: (batchId: string) => Promise<void>;
  status: 'demo' | 'live';
}) {
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [eggType, setEggType] = useState<CreateBatchInput['eggType']>('Chicken');
  const [incubatorName, setIncubatorName] = useState('Meeky Smart Incubator');
  const [quantity, setQuantity] = useState('30');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingEggType, setEditingEggType] = useState<CreateBatchInput['eggType']>('Chicken');
  const [editingIncubatorName, setEditingIncubatorName] = useState('');
  const [editingQuantity, setEditingQuantity] = useState('');
  const [editingStartDate, setEditingStartDate] = useState('');
  const [setupStepIndex, setSetupStepIndex] = useState(0);

  const completedBatches = batches.filter((batch) => Boolean(batch.completedAt));
  const totalSet = completedBatches.reduce((sum, batch) => sum + batch.quantity, 0);
  const totalHatched = completedBatches.reduce((sum, batch) => sum + (batch.hatchedCount ?? 0), 0);
  const averageHatchRate = totalSet > 0 ? Math.round((totalHatched / totalSet) * 100) : 0;
  const selectedCreateGuide =
    incubatorGuides.find((guide) => guide.name === incubatorName) ??
    linkedIncubatorGuides[0] ??
    incubatorGuides[0] ??
    null;

  async function handleCreateBatch() {
    const parsedQuantity = Number(quantity);

    if (!incubatorName.trim()) {
      Alert.alert('Incubator name needed', 'Add the incubator name before saving this batch.');
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('Invalid quantity', 'Enter the number of eggs you are setting.');
      return;
    }

    try {
      await onCreateBatch({
        eggType,
        incubatorName: incubatorName.trim(),
        quantitySet: parsedQuantity,
        startDate,
      });

      setShowCreateBatch(false);
      setQuantity('30');
      Alert.alert(
        'Batch created',
        status === 'live'
          ? 'The batch was saved to Firebase and should appear in your live dashboard.'
          : 'The batch was added in demo mode. Once Firebase is live, this same form will save online.',
      );
    } catch {
      Alert.alert('Could not create batch', 'Please check your Firebase setup and try again.');
    }
  }

  async function handleDeleteBatch(batchId: string) {
    try {
      await onDeleteBatch(batchId);
      Alert.alert('Batch deleted', 'The batch and its linked daily logs were removed.');
    } catch {
      Alert.alert('Could not delete batch', 'Please try again.');
    }
  }

  function startEditingBatch(batch: (typeof batches)[number]) {
    setEditingBatchId(batch.id);
    setEditingEggType(batch.eggType as CreateBatchInput['eggType']);
    setEditingIncubatorName(batch.incubatorName);
    setEditingQuantity(String(batch.quantity));
    setEditingStartDate(batch.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  }

  async function handleUpdateBatch() {
    if (!editingBatchId) {
      return;
    }

    const parsedQuantity = Number(editingQuantity);

    if (!editingIncubatorName.trim()) {
      Alert.alert('Incubator name needed', 'Add the incubator name before saving this batch.');
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('Invalid quantity', 'Enter the number of eggs you are setting.');
      return;
    }

    try {
      await onUpdateBatch({
        batchId: editingBatchId,
        eggType: editingEggType,
        incubatorName: editingIncubatorName.trim(),
        quantitySet: parsedQuantity,
        startDate: editingStartDate,
      });
      setEditingBatchId(null);
      Alert.alert('Batch updated', 'The hatch batch details were updated.');
    } catch {
      Alert.alert('Could not update batch', 'Please try again.');
    }
  }

  return (
    <View style={styles.sectionStack}>
      <SectionTitle
        title="Batch manager"
        subtitle="Each batch tracks stage, targets, and the next critical task."
      />
      {!canManageBatches ? (
        <EmptyStateCard
          title="Buyer account active"
          body="This account is currently set up for buying only. Switch your account type in Profile if you also want to hatch and track batches."
        />
      ) : null}
      {canManageBatches ? (
        <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hatch performance</Text>
        <Text style={styles.cardSubtitle}>
          Keep an eye on success rates so each batch becomes more profitable.
        </Text>
        <View style={styles.heroMetrics}>
          <MetricCard label="Completed" value={`${completedBatches.length}`} />
          <MetricCard label="Chicks hatched" value={`${totalHatched}`} />
          <MetricCard label="Avg hatch rate" value={`${averageHatchRate}%`} />
        </View>
        <View style={styles.heroMetrics}>
          <MetricCard label="Weak chicks" value={`${hatchAnalytics.totalWeak}`} />
          <MetricCard label="Unhatched" value={`${hatchAnalytics.totalUnhatched}`} />
          <MetricCard label="Loss rate" value={`${hatchAnalytics.lossRate}%`} />
        </View>
        <View style={styles.heroMetrics}>
          <MetricCard label="Ready to sell" value={`${hatchAnalytics.batchesReadyForSale}`} />
          <MetricCard label="Revenue view" value={`$${hatchAnalytics.potentialChickRevenue.toFixed(0)}`} />
          <MetricCard
            label="Best egg type"
            value={
              hatchAnalytics.topEggType
                ? `${hatchAnalytics.topEggType} ${hatchAnalytics.topEggTypeRate}%`
                : 'No data'
            }
          />
        </View>
        {hatchAnalytics.bestBatchName ? (
          <View style={styles.infoResultCard}>
            <Text style={styles.fieldLabel}>Best finished batch</Text>
            <Text style={styles.listText}>
              {hatchAnalytics.bestBatchName} delivered {hatchAnalytics.bestBatchRate ?? 0}% healthy hatch rate.
            </Text>
          </View>
        ) : null}
        {hatchAnalytics.topIncubatorName ? (
          <View style={styles.infoResultCard}>
            <Text style={styles.fieldLabel}>Top incubator model</Text>
            <Text style={styles.listText}>
              {hatchAnalytics.topIncubatorName} is currently leading with {hatchAnalytics.topIncubatorRate ?? 0}% hatch performance.
            </Text>
          </View>
        ) : null}
      </View>
      <Pressable onPress={() => setShowCreateBatch(true)} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>+ New hatch batch</Text>
      </Pressable>
      <Modal
        visible={showCreateBatch}
        animationType="slide"
        onRequestClose={() => setShowCreateBatch(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New hatch batch</Text>
            <Pressable onPress={() => setShowCreateBatch(false)} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create a new hatch batch</Text>
        <Text style={styles.cardSubtitle}>
          {status === 'live'
            ? 'Save a real batch to Firestore and drive the dashboard from live data.'
            : 'This works in demo mode too, so we can keep building the full flow before everything is live.'}
        </Text>

        {linkedIncubatorGuides.length > 0 ? (
          <View style={styles.infoResultCard}>
            <Text style={styles.fieldLabel}>Linked from your MeekyCart purchases</Text>
            <Text style={styles.listText}>
              Use the incubator you already bought as the starting point for this batch.
            </Text>
            <View style={styles.choiceRow}>
              {linkedIncubatorGuides.map((guide) => {
                const selected = guide.name === incubatorName;

                return (
                  <Pressable
                    key={`linked-${guide.id}`}
                    onPress={() => setIncubatorName(guide.name)}
                    style={[styles.choiceChip, selected && styles.choiceChipActive]}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                      {guide.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {selectedCreateGuide ? (
          <View style={styles.infoResultCard}>
            <Text style={styles.fieldLabel}>Exact-model setup wizard</Text>
            <Text style={styles.listText}>
              {selectedCreateGuide.name} • {selectedCreateGuide.capacityLabel}
            </Text>
            <Text style={styles.listText}>Best for: {selectedCreateGuide.bestFor}</Text>
            {selectedCreateGuide.preheatHours ? (
              <Text style={styles.listText}>Preheat: {selectedCreateGuide.preheatHours}</Text>
            ) : null}
            {selectedCreateGuide.roomPlacement ? (
              <Text style={styles.listText}>Placement: {selectedCreateGuide.roomPlacement}</Text>
            ) : null}
            {selectedCreateGuide.setupSteps?.length ? (
              <>
                <Text style={styles.listText}>
                  Step {Math.min(setupStepIndex + 1, selectedCreateGuide.setupSteps.length)} of {selectedCreateGuide.setupSteps.length}
                </Text>
                <Text style={styles.listText}>
                  {selectedCreateGuide.setupSteps[Math.min(setupStepIndex, selectedCreateGuide.setupSteps.length - 1)]}
                </Text>
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => setSetupStepIndex((current) => Math.max(0, current - 1))}
                    style={[styles.secondaryButton, styles.flexOne]}
                  >
                    <Text style={styles.secondaryButtonText}>Previous step</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      setSetupStepIndex((current) =>
                        Math.min((selectedCreateGuide.setupSteps?.length ?? 1) - 1, current + 1),
                      )
                    }
                    style={[styles.secondaryButton, styles.flexOne]}
                  >
                    <Text style={styles.secondaryButtonText}>Next step</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
            {selectedCreateGuide.starterAccessories?.length ? (
              <Text style={styles.listText}>
                Starter kit: {selectedCreateGuide.starterAccessories.join(', ')}
              </Text>
            ) : null}
            {selectedCreateGuide.warningTips?.map((tip) => (
              <Text key={tip} style={styles.listText}>
                • {tip}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.choiceRow}>
          {eggTypeOptions.map((option) => {
            const selected = option === eggType;

            return (
              <Pressable
                key={option}
                onPress={() => setEggType(option)}
                style={[styles.choiceChip, selected && styles.choiceChipActive]}
              >
                <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <LabeledField label="MeekyCart incubator model">
          <View style={styles.choiceRow}>
            {incubatorGuides.map((guide) => {
              const selected = guide.name === incubatorName;

              return (
                <Pressable
                  key={guide.id}
                  onPress={() => setIncubatorName(guide.name)}
                  style={[styles.choiceChip, selected && styles.choiceChipActive]}
                >
                  <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                    {guide.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </LabeledField>

        <LabeledField label="Incubator name">
          <TextInput
            value={incubatorName}
            onChangeText={setIncubatorName}
            placeholder="Meeky Smart Incubator"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
          />
        </LabeledField>

        <View style={styles.formRow}>
          <LabeledField label="Egg quantity" style={styles.flexOne}>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />
          </LabeledField>

          <LabeledField label="Start date" style={styles.flexOne}>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2026-04-08"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />
          </LabeledField>
        </View>

        <Pressable
          onPress={handleCreateBatch}
          disabled={creatingBatch}
          style={[styles.primaryButton, creatingBatch && styles.primaryButtonDisabled]}
        >
          {creatingBatch ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Save batch</Text>
          )}
        </Pressable>
      </View>
          </ScrollView>
        </View>
      </Modal>

      {batches.length === 0 ? (
        <EmptyStateCard
          title="No batches yet"
          body="Your saved hatch batches will appear here once you create the first one."
        />
      ) : null}

      {completedBatches.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Completed hatch history</Text>
          <Text style={styles.cardSubtitle}>
            Review finished batches and compare outcomes before setting the next eggs.
          </Text>
          {completedBatches.map((batch) => {
            const hatchRate =
              batch.quantity > 0 ? Math.round(((batch.hatchedCount ?? 0) / batch.quantity) * 100) : 0;

            return (
              <View key={`${batch.id}-history`} style={styles.infoResultCard}>
                <Text style={styles.cardTitle}>{batch.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {batch.completedAt ? new Date(batch.completedAt).toLocaleDateString() : 'Completed hatch'}
                </Text>
                <Text style={styles.listText}>
                  {batch.hatchedCount ?? 0} healthy, {batch.weakCount ?? 0} weak, {batch.unhatchedCount ?? 0} unhatched
                </Text>
                <Text style={styles.listText}>Hatch rate: {hatchRate}%</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {batches.map((batch) => (
        <View key={batch.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.flexOne}>
              <Text style={styles.cardTitle}>{batch.name}</Text>
              <Text style={styles.cardSubtitle}>
                {batch.eggType} eggs • {batch.quantity} set • {batch.incubatorName}
              </Text>
            </View>
            <View style={styles.stagePill}>
              <Text style={styles.stagePillText}>{batch.stage}</Text>
            </View>
          </View>
          {editingBatchId === batch.id ? (
            <>
              <View style={styles.choiceRow}>
                {eggTypeOptions.map((option) => {
                  const selected = option === editingEggType;

                  return (
                    <Pressable
                      key={option}
                      onPress={() => setEditingEggType(option)}
                      style={[styles.choiceChip, selected && styles.choiceChipActive]}
                    >
                      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <LabeledField label="Incubator name">
                <TextInput
                  value={editingIncubatorName}
                  onChangeText={setEditingIncubatorName}
                  placeholder="Meeky Smart Incubator"
                  placeholderTextColor={colors.mutedText}
                  style={styles.input}
                />
              </LabeledField>
              <LabeledField label="MeekyCart incubator model">
                <View style={styles.choiceRow}>
                  {incubatorGuides.map((guide) => {
                    const selected = guide.name === editingIncubatorName;

                    return (
                      <Pressable
                        key={guide.id}
                        onPress={() => setEditingIncubatorName(guide.name)}
                        style={[styles.choiceChip, selected && styles.choiceChipActive]}
                      >
                        <Text
                          style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}
                        >
                          {guide.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </LabeledField>
              <View style={styles.formRow}>
                <LabeledField label="Egg quantity" style={styles.flexOne}>
                  <TextInput
                    value={editingQuantity}
                    onChangeText={setEditingQuantity}
                    keyboardType="number-pad"
                    placeholder="30"
                    placeholderTextColor={colors.mutedText}
                    style={styles.input}
                  />
                </LabeledField>
                <LabeledField label="Start date" style={styles.flexOne}>
                  <TextInput
                    value={editingStartDate}
                    onChangeText={setEditingStartDate}
                    placeholder="2026-04-08"
                    placeholderTextColor={colors.mutedText}
                    style={styles.input}
                  />
                </LabeledField>
              </View>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleUpdateBatch}
                  disabled={updatingBatch === batch.id}
                  style={[
                    styles.primaryButton,
                    styles.flexOne,
                    updatingBatch === batch.id && styles.primaryButtonDisabled,
                  ]}
                >
                  {updatingBatch === batch.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save changes</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setEditingBatchId(null)}
                  style={[styles.secondaryButton, styles.flexOne]}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.heroMetrics}>
                <MetricCard label="Day" value={`${batch.currentDay}/${batch.totalDays}`} />
                <MetricCard label="Temp" value={batch.targetTemp} />
                <MetricCard label="Humidity" value={batch.targetHumidity} />
              </View>
              <Text style={styles.batchTask}>{batch.nextTask}</Text>
              <Pressable onPress={() => startEditingBatch(batch)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Edit batch</Text>
              </Pressable>
            </>
          )}
          <Pressable
            onPress={() => handleDeleteBatch(batch.id)}
            disabled={deletingBatch === batch.id}
            style={[styles.dangerButton, deletingBatch === batch.id && styles.primaryButtonDisabled]}
          >
            {deletingBatch === batch.id ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Delete batch</Text>
            )}
          </Pressable>
        </View>
      ))}
        </>
      ) : null}
    </View>
  );
}

function MarketplaceTab({
  activeBatch,
  buyerHomeLocation,
  canSell,
  creatingListing,
  creatingInquiry,
  savingSavedListingId,
  sendingMarketplaceMessage,
  updatingListing,
  updatingListingStatus,
  updatingInquiryStatus,
  deletingListing,
  marketplaceDrafts,
  publicMarketplaceListings,
  savedMarketplaceListingIds,
  listingInquiries,
  marketplaceMessages,
  onCreateListing,
  onCreateInquiry,
  onToggleSavedListing,
  onSendMarketplaceMessage,
  onUpdateListing,
  onUpdateListingStatus,
  onUpdateInquiryStatus,
  onDeleteListing,
}: {
  activeBatch: {
    id: string;
    eggType: string;
    hatchedCount?: number;
  } | null;
  buyerHomeLocation: string;
  canSell: boolean;
  creatingListing: boolean;
  creatingInquiry: boolean;
  savingSavedListingId: string | null;
  sendingMarketplaceMessage: string | null;
  updatingListing: string | null;
  updatingListingStatus: string | null;
  updatingInquiryStatus: string | null;
  deletingListing: string | null;
  marketplaceDrafts: Array<{
    id: string;
    title: string;
    category: CreateMarketplaceListingInput['category'];
    location: string;
    quantity: number;
    price: string;
    status: string;
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
  }>;
  publicMarketplaceListings: Array<{
    id: string;
    sellerId?: string;
    title: string;
    category: CreateMarketplaceListingInput['category'];
    location: string;
    quantity: number;
    price: string;
    status: string;
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
  }>;
  savedMarketplaceListingIds: string[];
  listingInquiries: ListingInquiry[];
  marketplaceMessages: MarketplaceMessage[];
  onCreateListing: (input: CreateMarketplaceListingInput) => Promise<void>;
  onCreateInquiry: (input: CreateListingInquiryInput) => Promise<void>;
  onToggleSavedListing: (listingId: string) => Promise<void>;
  onSendMarketplaceMessage: (input: CreateMarketplaceMessageInput) => Promise<void>;
  onUpdateListing: (input: UpdateMarketplaceListingInput) => Promise<void>;
  onUpdateListingStatus: (input: { listingId: string; status: 'draft' | 'live' | 'sold' }) => Promise<void>;
  onUpdateInquiryStatus: (input: UpdateListingInquiryStatusInput) => Promise<void>;
  onDeleteListing: (listingId: string) => Promise<void>;
}) {
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [marketFilter, setMarketFilter] = useState<'all' | 'draft' | 'live' | 'sold'>('all');
  const [buyerSearch, setBuyerSearch] = useState('');
  const [buyerLocationFilter, setBuyerLocationFilter] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [buyerSort, setBuyerSort] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [inquiringListingId, setInquiringListingId] = useState<string | null>(null);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversationReply, setConversationReply] = useState('');
  const [title, setTitle] = useState(`${activeBatch?.eggType ?? 'Chicken'} chicks`);
  const [category, setCategory] = useState<CreateMarketplaceListingInput['category']>('chicks');
  const [quantity, setQuantity] = useState(String(activeBatch?.hatchedCount ?? 12));
  const [price, setPrice] = useState('1.20');
  const [location, setLocation] = useState('Harare');
  const [description, setDescription] = useState('Fresh hatch, healthy chicks, ready for brooding.');
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('pickup');
  const [imageAssetUri, setImageAssetUri] = useState<string | null>(null);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingCategory, setEditingCategory] =
    useState<CreateMarketplaceListingInput['category']>('chicks');
  const [editingQuantity, setEditingQuantity] = useState('');
  const [editingPrice, setEditingPrice] = useState('');
  const [editingLocation, setEditingLocation] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [editingDeliveryOption, setEditingDeliveryOption] = useState<DeliveryOption>('pickup');
  const [editingImageAssetUri, setEditingImageAssetUri] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | undefined>(undefined);
  const draftCount = marketplaceDrafts.filter((listing) => listing.status === 'Draft').length;
  const liveCount = marketplaceDrafts.filter((listing) => listing.status === 'Live').length;
  const soldCount = marketplaceDrafts.filter((listing) => listing.status === 'Sold').length;
  const savedCount = publicMarketplaceListings.filter((listing) =>
    savedMarketplaceListingIds.includes(listing.id),
  ).length;
  const buyerLocationOptions = Array.from(
    new Set(
      [buyerHomeLocation, ...publicMarketplaceListings.map((listing) => listing.location)]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(0, 6);
  const liveBuyerListings = [...publicMarketplaceListings]
    .filter((listing) => {
      const matchesSearch =
        !buyerSearch.trim() ||
        `${listing.title} ${listing.description ?? ''} ${listing.sellerFarmName ?? ''}`
          .toLowerCase()
          .includes(buyerSearch.trim().toLowerCase());
      const matchesLocation =
        !buyerLocationFilter.trim() ||
        listing.location.toLowerCase().includes(buyerLocationFilter.trim().toLowerCase());
      const matchesSaved = !savedOnly || savedMarketplaceListingIds.includes(listing.id);

      return matchesSearch && matchesLocation && matchesSaved;
    })
    .sort((left, right) => {
      const leftPrice = Number(left.price.replace('$', '').replace(' each', ''));
      const rightPrice = Number(right.price.replace('$', '').replace(' each', ''));

      if (buyerSort === 'price-low') {
        return leftPrice - rightPrice;
      }

      if (buyerSort === 'price-high') {
        return rightPrice - leftPrice;
      }

      return String(right.availableFrom ?? '').localeCompare(String(left.availableFrom ?? ''));
    });
  const filteredListings = marketplaceDrafts.filter((listing) => {
    if (marketFilter === 'all') {
      return true;
    }

    if (marketFilter === 'draft') {
      return listing.status === 'Draft';
    }

    if (marketFilter === 'live') {
      return listing.status === 'Live';
    }

    return listing.status === 'Sold';
  });
  const sortedConversations = [...listingInquiries].sort((left, right) =>
    String(right.lastMessageAt ?? right.createdAt).localeCompare(
      String(left.lastMessageAt ?? left.createdAt),
    ),
  );
  const activeConversation =
    sortedConversations.find((inquiry) => inquiry.id === activeConversationId) ??
    sortedConversations[0] ??
    null;
  const activeConversationMessages = marketplaceMessages
    .filter((message) => message.threadId === activeConversation?.id)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to choose a marketplace image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setImageAssetUri(result.assets[0].uri);
    }
  }

  async function handleCreateListing() {
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);

    if (!title.trim()) {
      Alert.alert('Title needed', 'Add a listing title before saving.');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Location needed', 'Add a location for the marketplace listing.');
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('Invalid quantity', 'Enter a valid number of birds or items.');
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Invalid price', 'Enter a valid price in USD.');
      return;
    }

    try {
      await onCreateListing({
        sourceBatchId: activeBatch?.id,
        title: title.trim(),
        category,
        quantity: parsedQuantity,
        price: parsedPrice,
        location: location.trim(),
        description,
        imageAssetUri: imageAssetUri ?? undefined,
        deliveryOption,
      });
      setShowCreateListing(false);
      setImageAssetUri(null);
      Alert.alert('Listing created', 'Your marketplace draft was saved successfully.');
    } catch {
      Alert.alert('Could not create listing', 'Please check your Firebase setup and try again.');
    }
  }

  async function handleDeleteListing(listingId: string) {
    try {
      await onDeleteListing(listingId);
      Alert.alert('Listing deleted', 'The marketplace draft was removed.');
    } catch {
      Alert.alert('Could not delete listing', 'Please try again.');
    }
  }

  function startEditingListing(draft: (typeof marketplaceDrafts)[number]) {
    setEditingListingId(draft.id);
    setEditingTitle(draft.title);
    setEditingCategory(draft.category);
    setEditingQuantity(String(draft.quantity));
    setEditingPrice(draft.price.replace('$', '').replace(' each', ''));
    setEditingLocation(draft.location);
    setEditingDescription(draft.description ?? '');
    setEditingDeliveryOption(draft.deliveryOption ?? 'pickup');
    setEditingImageAssetUri(null);
    setEditingImageUrl(draft.imageUrl);
  }

  async function handlePickEditingImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to choose a marketplace image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setEditingImageAssetUri(result.assets[0].uri);
    }
  }

  async function handleUpdateListing() {
    if (!editingListingId) {
      return;
    }

    const parsedQuantity = Number(editingQuantity);
    const parsedPrice = Number(editingPrice);

    if (!editingTitle.trim()) {
      Alert.alert('Title needed', 'Add a listing title before saving.');
      return;
    }

    if (!editingLocation.trim()) {
      Alert.alert('Location needed', 'Add a location for the marketplace listing.');
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert('Invalid quantity', 'Enter a valid number of birds or items.');
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Invalid price', 'Enter a valid price in USD.');
      return;
    }

    try {
      await onUpdateListing({
        listingId: editingListingId,
        sourceBatchId: activeBatch?.id,
        title: editingTitle.trim(),
        category: editingCategory,
        quantity: parsedQuantity,
        price: parsedPrice,
        location: editingLocation.trim(),
        description: editingDescription,
        imageAssetUri: editingImageAssetUri ?? undefined,
        existingImageUrl: editingImageUrl,
        deliveryOption: editingDeliveryOption,
      });
      setEditingListingId(null);
      Alert.alert('Listing updated', 'The marketplace draft was updated.');
    } catch {
      Alert.alert('Could not update listing', 'Please try again.');
    }
  }

  async function handleChangeListingStatus(
    listingId: string,
    status: 'draft' | 'live' | 'sold',
  ) {
    try {
      await onUpdateListingStatus({ listingId, status });
      Alert.alert(
        'Listing updated',
        status === 'live'
          ? 'The listing is now live in the marketplace.'
          : status === 'sold'
            ? 'The listing was marked as sold.'
            : 'The listing was moved back to draft.',
      );
    } catch {
      Alert.alert('Could not update listing', 'Please try again.');
    }
  }

  async function handleContactSeller(draft: (typeof marketplaceDrafts)[number]) {
    if (draft.contactPreference === 'in-app') {
      Alert.alert(
        'In-app chat next',
        draft.sellerPhone
          ? `In-app messaging is still coming. For now, buyers can still call ${draft.sellerPhone}.`
          : 'In-app messaging is still coming. Add a seller phone number in the farm profile for now.',
      );
      return;
    }

    if (!draft.sellerPhone) {
      Alert.alert('Phone missing', 'This listing does not have a seller phone number yet.');
      return;
    }

    try {
      await Linking.openURL(`tel:${draft.sellerPhone}`);
    } catch {
      Alert.alert('Could not open phone', 'Please try calling the seller manually.');
    }
  }

  async function handleSendInquiry(listing: (typeof publicMarketplaceListings)[number]) {
    if (!listing.sellerId) {
      Alert.alert('Seller missing', 'This listing is missing seller information.');
      return;
    }

    if (!inquiryMessage.trim()) {
      Alert.alert('Message needed', 'Write a short question for the seller before sending.');
      return;
    }

    try {
      await onCreateInquiry({
        listingId: listing.id,
        listingTitle: listing.title,
        sellerId: listing.sellerId,
        message: inquiryMessage,
      });
      setInquiryMessage('');
      setInquiringListingId(null);
      Alert.alert('Inquiry sent', 'Your message has been saved in the seller inbox.');
    } catch {
      Alert.alert('Could not send inquiry', 'Please try again.');
    }
  }

  async function handleUpdateInquiry(
    inquiryId: string,
    status: InquiryStatus,
  ) {
    try {
      await onUpdateInquiryStatus({ inquiryId, status });
      Alert.alert(
        'Inquiry updated',
        status === 'contacted'
          ? 'This buyer has been marked as contacted.'
          : 'This inquiry was closed.',
      );
    } catch {
      Alert.alert('Could not update inquiry', 'Please try again.');
    }
  }

  async function handleSendConversationReply() {
    if (!activeConversation) {
      Alert.alert('Choose a conversation', 'Select a buyer conversation before sending a reply.');
      return;
    }

    if (!conversationReply.trim()) {
      Alert.alert('Message needed', 'Write a short message before sending it.');
      return;
    }

    try {
      await onSendMarketplaceMessage({
        threadId: activeConversation.id,
        listingId: activeConversation.listingId,
        sellerId: activeConversation.sellerId,
        buyerId: activeConversation.buyerId,
        message: conversationReply,
      });
      setConversationReply('');
      Alert.alert('Message sent', 'The conversation was updated successfully.');
    } catch {
      Alert.alert('Could not send message', 'Please try again.');
    }
  }

  async function handleToggleSavedListing(listingId: string) {
    try {
      await onToggleSavedListing(listingId);
    } catch {
      Alert.alert('Could not update saved listing', 'Please try again.');
    }
  }

  return (
    <View style={styles.sectionStack}>
      <SectionTitle
        title="Farmer marketplace"
        subtitle="Same app, same account, small commission on completed sales."
      />
      <View style={[styles.card, styles.marketplaceCard]}>
        <Text style={styles.cardTitle}>Sell what you hatch</Text>
        <Text style={styles.marketplaceText}>
          Publish day-old chicks, fertile eggs, mature birds, and poultry accessories once users
          are ready to trade.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Buyer safety</Text>
        <Text style={styles.cardSubtitle}>
          Payments happen directly between buyer and seller. MK Hatch Pilot does not hold customer money.
        </Text>
        <Text style={styles.listText}>Use cash on delivery or another payment method you trust locally.</Text>
        <Text style={styles.listText}>Meet in safe public places or buy from verified sellers when possible.</Text>
        <Text style={styles.listText}>Do not pay deposits to unknown sellers just because a listing looks urgent.</Text>
        <Text style={styles.listText}>Inspect chicks, eggs, or birds before completing the transaction.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Marketplace overview</Text>
        <Text style={styles.cardSubtitle}>
          Track what is still in draft, what is live for buyers, and what has already sold.
        </Text>
        <View style={styles.heroMetrics}>
          <MetricCard label="Draft" value={`${draftCount}`} />
          <MetricCard label="Live" value={`${liveCount}`} />
          <MetricCard label="Sold" value={`${soldCount}`} />
          <MetricCard label="Saved" value={`${savedCount}`} />
        </View>
        <View style={styles.choiceRow}>
          {([
            ['all', 'All'],
            ['draft', 'Drafts'],
            ['live', 'Live'],
            ['sold', 'Sold'],
          ] as const).map(([value, label]) => {
            const selected = marketFilter === value;

            return (
              <Pressable
                key={value}
                onPress={() => setMarketFilter(value)}
                style={[styles.choiceChip, selected && styles.choiceChipActive]}
              >
                <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Buyer board</Text>
        <Text style={styles.cardSubtitle}>
          This is what buyers can browse right now from the live side of the marketplace.
        </Text>
        <View style={styles.formRow}>
          <LabeledField label="Search listings" style={styles.flexOne}>
            <TextInput
              value={buyerSearch}
              onChangeText={setBuyerSearch}
              placeholder="Chicks, eggs, farm name"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />
          </LabeledField>
          <LabeledField label="Location" style={styles.flexOne}>
            <TextInput
              value={buyerLocationFilter}
              onChangeText={setBuyerLocationFilter}
              placeholder="Harare"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />
          </LabeledField>
        </View>
        {buyerLocationOptions.length > 0 ? (
          <LabeledField label="Browse by area">
            <View style={styles.choiceRow}>
              {buyerLocationOptions.map((locationOption) => {
                const selected = buyerLocationFilter === locationOption;
                const label =
                  buyerHomeLocation && locationOption === buyerHomeLocation
                    ? `My area: ${locationOption}`
                    : locationOption;

                return (
                  <Pressable
                    key={locationOption}
                    onPress={() =>
                      setBuyerLocationFilter((current) =>
                        current === locationOption ? '' : locationOption,
                      )
                    }
                    style={[styles.choiceChip, selected && styles.choiceChipActive]}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </LabeledField>
        ) : null}
        <LabeledField label="Sort buyer results">
          <View style={styles.choiceRow}>
            {([
              ['newest', 'Newest'],
              ['price-low', 'Price low'],
              ['price-high', 'Price high'],
            ] as const).map(([value, label]) => {
              const selected = value === buyerSort;

              return (
                <Pressable
                  key={value}
                  onPress={() => setBuyerSort(value)}
                  style={[styles.choiceChip, selected && styles.choiceChipActive]}
                >
                  <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </LabeledField>
        <View style={styles.choiceRow}>
          <Pressable
            onPress={() => setSavedOnly((current) => !current)}
            style={[styles.choiceChip, savedOnly && styles.choiceChipActive]}
          >
            <Text style={[styles.choiceChipText, savedOnly && styles.choiceChipTextActive]}>
              {savedOnly ? 'Showing saved only' : 'Saved only'}
            </Text>
          </Pressable>
          {(buyerSearch || buyerLocationFilter || savedOnly) ? (
            <Pressable
              onPress={() => {
                setBuyerSearch('');
                setBuyerLocationFilter('');
                setSavedOnly(false);
              }}
              style={styles.linkButton}
            >
              <Text style={styles.linkButtonText}>Clear buyer filters</Text>
            </Pressable>
          ) : null}
        </View>

        {liveBuyerListings.length === 0 ? (
          <Text style={styles.listText}>
            No live listings matched this buyer view yet. Try clearing filters or publish a live listing.
          </Text>
        ) : (
          <View style={styles.sectionStackTight}>
            {liveBuyerListings.map((listing) => (
              <View key={`${listing.id}-buyer`} style={styles.infoResultCard}>
                <View style={styles.rowBetween}>
                  <View style={styles.flexOne}>
                    <Text style={styles.cardTitle}>{listing.title}</Text>
                    <Text style={styles.cardSubtitle}>
                      {listing.location} • {listing.quantity} available
                    </Text>
                  </View>
                  <View style={styles.sectionStackTight}>
                    <View
                      style={[
                        styles.statusChip,
                        listing.sellerVerificationStatus === 'verified'
                          ? styles.statusChipVerified
                          : listing.sellerVerificationStatus === 'pending'
                            ? styles.statusChipPending
                            : styles.statusChipMuted,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          listing.sellerVerificationStatus === 'verified'
                            ? styles.statusChipTextVerified
                            : listing.sellerVerificationStatus === 'pending'
                              ? styles.statusChipTextPending
                              : styles.statusChipTextMuted,
                        ]}
                      >
                        {listing.sellerVerificationStatus === 'verified'
                          ? '✓ Verified'
                          : listing.sellerVerificationStatus === 'pending'
                            ? '⏳ Pending'
                            : '○ Unverified'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleToggleSavedListing(listing.id)}
                      disabled={savingSavedListingId === listing.id}
                      style={styles.linkButton}
                    >
                      <Text style={styles.linkButtonText}>
                        {savingSavedListingId === listing.id
                          ? 'Saving...'
                          : savedMarketplaceListingIds.includes(listing.id)
                            ? 'Saved'
                            : 'Save'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.priceText}>{listing.price}</Text>
                <Text style={styles.listText}>{listing.description ?? 'Fresh stock available now.'}</Text>
                <Text style={styles.listText}>
                  Seller: {listing.sellerFarmName ?? listing.sellerName ?? 'Seller profile pending'}
                </Text>
                <Text style={styles.listText}>
                  Delivery:{' '}
                  {listing.deliveryOption === 'delivery'
                    ? 'Delivery offered'
                    : listing.deliveryOption === 'either'
                      ? 'Pickup or delivery'
                      : 'Pickup only'}
                </Text>
                <Text style={styles.listText}>
                  Buyer warning: prefer verified sellers, inspect stock in person, and avoid risky deposits.
                </Text>
                <View style={styles.actionRow}>
                  <Pressable onPress={() => handleContactSeller(listing)} style={[styles.secondaryButton, styles.flexOne]}>
                    <Text style={styles.secondaryButtonText}>
                      {listing.contactPreference === 'in-app' ? 'Call for now' : 'Call seller'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setInquiringListingId(listing.id);
                      setInquiryMessage(
                        `Hi, I’m interested in ${listing.title}. Is it still available?`,
                      );
                    }}
                    style={[styles.primaryButton, styles.flexOne]}
                  >
                    <Text style={styles.primaryButtonText}>Send inquiry</Text>
                  </Pressable>
                </View>
                {inquiringListingId === listing.id ? (
                  <View style={styles.infoResultCard}>
                    <Text style={styles.fieldLabel}>Message seller</Text>
                    <TextInput
                      value={inquiryMessage}
                      onChangeText={setInquiryMessage}
                      placeholder="Ask about quantity, pickup time, or breed details."
                      placeholderTextColor={colors.mutedText}
                      style={[styles.input, styles.multilineInput]}
                      multiline
                    />
                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => handleSendInquiry(listing)}
                        disabled={creatingInquiry}
                        style={[styles.primaryButton, styles.flexOne, creatingInquiry && styles.primaryButtonDisabled]}
                      >
                        {creatingInquiry ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.primaryButtonText}>Send message</Text>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setInquiringListingId(null);
                          setInquiryMessage('');
                        }}
                        style={[styles.secondaryButton, styles.flexOne]}
                      >
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>

      {sortedConversations.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Conversations</Text>
          <Text style={styles.cardSubtitle}>
            Buyers and sellers can keep chatting in one thread while payments and final handoff still happen offline.
          </Text>
          <View style={styles.sectionStackTight}>
            {sortedConversations.map((inquiry) => (
              <View key={inquiry.id} style={styles.infoResultCard}>
                <View style={styles.rowBetween}>
                  <View style={styles.flexOne}>
                    <Text style={styles.cardTitle}>{inquiry.listingTitle}</Text>
                    <Text style={styles.cardSubtitle}>
                      {inquiry.buyerName} • {new Date(inquiry.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setActiveConversationId(inquiry.id)}
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkButtonText}>Open</Text>
                  </Pressable>
                </View>
                <Text style={styles.cardSubtitle}>
                  Status: {inquiry.status === 'new' ? 'New' : inquiry.status === 'contacted' ? 'Contacted' : 'Closed'}
                </Text>
                <Text style={styles.listText}>{inquiry.lastMessage ?? inquiry.message}</Text>
                <Text style={styles.listText}>
                  Buyer phone: {inquiry.buyerPhone ?? 'Not shared yet'}
                </Text>
                {canSell ? (
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => handleUpdateInquiry(inquiry.id, 'contacted')}
                      disabled={updatingInquiryStatus === inquiry.id}
                      style={[styles.secondaryButton, styles.flexOne, updatingInquiryStatus === inquiry.id && styles.primaryButtonDisabled]}
                    >
                      <Text style={styles.secondaryButtonText}>Mark contacted</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleUpdateInquiry(inquiry.id, 'closed')}
                      disabled={updatingInquiryStatus === inquiry.id}
                      style={[styles.primaryButton, styles.flexOne, updatingInquiryStatus === inquiry.id && styles.primaryButtonDisabled]}
                    >
                      <Text style={styles.primaryButtonText}>Close inquiry</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {activeConversation ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thread view</Text>
          <Text style={styles.cardSubtitle}>
            {activeConversation.listingTitle} • {activeConversation.buyerName}
          </Text>
          <View style={styles.sectionStackTight}>
            {activeConversationMessages.map((message) => {
              const mine =
                (canSell && message.senderRole === 'seller') ||
                (!canSell && message.senderRole === 'buyer');

              return (
                <View
                  key={message.id}
                  style={[
                    styles.infoResultCard,
                    mine ? styles.messageBubbleMine : styles.messageBubbleOther,
                  ]}
                >
                  <Text style={styles.fieldLabel}>
                    {message.senderName} • {new Date(message.createdAt).toLocaleString()}
                  </Text>
                  <Text style={styles.listText}>{message.message}</Text>
                </View>
              );
            })}
          </View>
          <LabeledField label="Reply in this thread">
            <TextInput
              value={conversationReply}
              onChangeText={setConversationReply}
              placeholder="Share pickup time, availability, or next steps."
              placeholderTextColor={colors.mutedText}
              style={[styles.input, styles.multilineInput]}
              multiline
            />
          </LabeledField>
          <Pressable
            onPress={handleSendConversationReply}
            disabled={sendingMarketplaceMessage === activeConversation.id}
            style={[
              styles.primaryButton,
              sendingMarketplaceMessage === activeConversation.id && styles.primaryButtonDisabled,
            ]}
          >
            {sendingMarketplaceMessage === activeConversation.id ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Send reply</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {canSell ? (
        <Pressable onPress={() => setShowCreateListing(true)} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>+ New listing</Text>
        </Pressable>
      ) : (
        <EmptyStateCard
          title="Buyer mode active"
          body="You can browse live listings now. Switch your account type in Profile if you also want to publish and manage listings."
        />
      )}
      <Modal
        visible={showCreateListing}
        animationType="slide"
        onRequestClose={() => setShowCreateListing(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New listing</Text>
            <Pressable onPress={() => setShowCreateListing(false)} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
        <Text style={styles.cardTitle}>Create marketplace listing</Text>
        <Text style={styles.cardSubtitle}>
          Start with a draft listing linked to the active hatch batch.
        </Text>

        {!activeBatch ? (
          <Text style={styles.listText}>
            No active hatch batch is available yet, so this listing will be saved without a linked batch.
          </Text>
        ) : null}

        <LabeledField label="Listing title">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Chicken chicks"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
          />
        </LabeledField>

        <View style={styles.choiceRow}>
          {(['chicks', 'fertile-eggs', 'birds', 'equipment'] as const).map((option) => {
            const selected = option === category;

            return (
              <Pressable
                key={option}
                onPress={() => setCategory(option)}
                style={[styles.choiceChip, selected && styles.choiceChipActive]}
              >
                <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.formRow}>
          <LabeledField label="Quantity" style={styles.flexOne}>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="12"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />
          </LabeledField>

          <LabeledField label="Price USD" style={styles.flexOne}>
            <TextInput
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="1.20"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />
          </LabeledField>
        </View>

        <LabeledField label="Location">
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Harare"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
          />
        </LabeledField>
        <LabeledField label="Listing details">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Share hatch quality, breed details, and pickup information."
            placeholderTextColor={colors.mutedText}
            style={[styles.input, styles.multilineInput]}
            multiline
          />
        </LabeledField>

        <LabeledField label="Delivery option">
          <View style={styles.choiceRow}>
            {([
              ['pickup', 'Pickup'],
              ['delivery', 'Delivery'],
              ['either', 'Either'],
            ] as const).map(([value, label]) => {
              const selected = value === deliveryOption;

              return (
                <Pressable
                  key={value}
                  onPress={() => setDeliveryOption(value)}
                  style={[styles.choiceChip, selected && styles.choiceChipActive]}
                >
                  <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </LabeledField>

        <Pressable onPress={handlePickImage} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>
            {imageAssetUri ? 'Change listing image' : 'Choose listing image'}
          </Text>
        </Pressable>

        {imageAssetUri ? (
          <View style={styles.imagePreviewCard}>
            <Image source={{ uri: imageAssetUri }} style={styles.imagePreview} />
          </View>
        ) : null}

        <Pressable
          onPress={handleCreateListing}
          disabled={creatingListing}
          style={[styles.primaryButton, creatingListing && styles.primaryButtonDisabled]}
        >
          {creatingListing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Save listing draft</Text>
          )}
        </Pressable>
      </View>
          </ScrollView>
        </View>
      </Modal>

      {canSell && marketplaceDrafts.length === 0 ? (
        <EmptyStateCard
          title="No listing drafts yet"
          body="Once you create a marketplace listing draft, it will show up here ready for review."
        />
      ) : null}

      {canSell && marketplaceDrafts.length > 0 && filteredListings.length === 0 ? (
        <EmptyStateCard
          title="No listings in this view"
          body="Switch filters or publish a draft to move more stock into the live marketplace."
        />
      ) : null}

      {canSell ? filteredListings.map((draft) => (
        <View key={draft.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.flexOne}>
              <Text style={styles.cardTitle}>{draft.title}</Text>
              <Text style={styles.cardSubtitle}>
                {draft.location} • {draft.quantity} available
              </Text>
            </View>
            <View style={styles.marketBadge}>
              <Text style={styles.marketBadgeText}>
                {draft.status === 'Live' ? '● Live' : draft.status === 'Sold' ? '✓ Sold' : '○ Draft'}
              </Text>
            </View>
          </View>
          {editingListingId === draft.id ? (
            <>
              <LabeledField label="Listing title">
                <TextInput
                  value={editingTitle}
                  onChangeText={setEditingTitle}
                  placeholder="Chicken chicks"
                  placeholderTextColor={colors.mutedText}
                  style={styles.input}
                />
              </LabeledField>
              <View style={styles.choiceRow}>
                {(['chicks', 'fertile-eggs', 'birds', 'equipment'] as const).map((option) => {
                  const selected = option === editingCategory;

                  return (
                    <Pressable
                      key={option}
                      onPress={() => setEditingCategory(option)}
                      style={[styles.choiceChip, selected && styles.choiceChipActive]}
                    >
                      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.formRow}>
                <LabeledField label="Quantity" style={styles.flexOne}>
                  <TextInput
                    value={editingQuantity}
                    onChangeText={setEditingQuantity}
                    keyboardType="number-pad"
                    placeholder="12"
                    placeholderTextColor={colors.mutedText}
                    style={styles.input}
                  />
                </LabeledField>
                <LabeledField label="Price USD" style={styles.flexOne}>
                  <TextInput
                    value={editingPrice}
                    onChangeText={setEditingPrice}
                    keyboardType="decimal-pad"
                    placeholder="1.20"
                    placeholderTextColor={colors.mutedText}
                    style={styles.input}
                  />
                </LabeledField>
              </View>
              <LabeledField label="Location">
                <TextInput
                  value={editingLocation}
                  onChangeText={setEditingLocation}
                  placeholder="Harare"
                  placeholderTextColor={colors.mutedText}
                  style={styles.input}
                />
              </LabeledField>
              <LabeledField label="Listing details">
                <TextInput
                  value={editingDescription}
                  onChangeText={setEditingDescription}
                  placeholder="Share hatch quality, breed details, and pickup information."
                  placeholderTextColor={colors.mutedText}
                  style={[styles.input, styles.multilineInput]}
                  multiline
                />
              </LabeledField>
              <LabeledField label="Delivery option">
                <View style={styles.choiceRow}>
                  {([
                    ['pickup', 'Pickup'],
                    ['delivery', 'Delivery'],
                    ['either', 'Either'],
                  ] as const).map(([value, label]) => {
                    const selected = value === editingDeliveryOption;

                    return (
                      <Pressable
                        key={value}
                        onPress={() => setEditingDeliveryOption(value)}
                        style={[styles.choiceChip, selected && styles.choiceChipActive]}
                      >
                        <Text
                          style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </LabeledField>
              <Pressable onPress={handlePickEditingImage} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>
                  {editingImageAssetUri || editingImageUrl ? 'Change listing image' : 'Choose listing image'}
                </Text>
              </Pressable>
              {editingImageAssetUri || editingImageUrl ? (
                <View style={styles.imagePreviewCard}>
                  <Image source={{ uri: editingImageAssetUri ?? editingImageUrl }} style={styles.imagePreview} />
                </View>
              ) : null}
              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleUpdateListing}
                  disabled={updatingListing === draft.id}
                  style={[
                    styles.primaryButton,
                    styles.flexOne,
                    updatingListing === draft.id && styles.primaryButtonDisabled,
                  ]}
                >
                  {updatingListing === draft.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save changes</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setEditingListingId(null)}
                  style={[styles.secondaryButton, styles.flexOne]}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {draft.imageUrl ? (
                <View style={styles.imagePreviewCard}>
                  <Image source={{ uri: draft.imageUrl }} style={styles.imagePreview} />
                </View>
              ) : null}
              <Text style={styles.priceText}>{draft.price}</Text>
              <Text style={styles.listText}>
                {draft.description ?? 'Listing flow should be prefilled from hatch results to save time and improve seller conversion.'}
              </Text>
              <View style={styles.marketMetaRow}>
                <View
                  style={[
                    styles.statusChip,
                    draft.sellerVerificationStatus === 'verified'
                      ? styles.statusChipVerified
                      : draft.sellerVerificationStatus === 'pending'
                        ? styles.statusChipPending
                        : styles.statusChipMuted,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      draft.sellerVerificationStatus === 'verified'
                        ? styles.statusChipTextVerified
                        : draft.sellerVerificationStatus === 'pending'
                          ? styles.statusChipTextPending
                          : styles.statusChipTextMuted,
                    ]}
                  >
                    {draft.sellerVerificationStatus === 'verified'
                      ? '✓ Verified seller'
                      : draft.sellerVerificationStatus === 'pending'
                        ? '⏳ Verification pending'
                        : '○ Unverified seller'}
                  </Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText}>
                    {draft.contactPreference === 'in-app' ? 'Buyer contact: In-app' : 'Buyer contact: Phone'}
                  </Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText}>
                    {draft.deliveryOption === 'delivery'
                      ? 'Delivery offered'
                      : draft.deliveryOption === 'either'
                        ? 'Pickup or delivery'
                        : 'Pickup only'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoResultCard}>
                <Text style={styles.fieldLabel}>Seller contact</Text>
                <Text style={styles.listText}>
                  {draft.sellerFarmName ?? draft.sellerName ?? 'Farm profile not set yet'}
                </Text>
                <Text style={styles.listText}>
                  {draft.sellerPhone ?? 'Add a phone number in your farm profile'}
                </Text>
                <Text style={styles.listText}>
                  Available from:{' '}
                  {draft.availableFrom ? new Date(draft.availableFrom).toLocaleDateString() : 'Now'}
                </Text>
              </View>
              <View style={styles.infoResultCard}>
                <Text style={styles.fieldLabel}>Commission preview</Text>
                <Text style={styles.listText}>
                  Marketplace fee: {Math.round((draft.commissionRate ?? 0.05) * 100)}%
                </Text>
                <Text style={styles.listText}>
                  Gross sale value: ${Number(draft.grossRevenue ?? 0).toFixed(2)}
                </Text>
                <Text style={styles.listText}>
                  Estimated seller payout: ${Number(draft.sellerNetAmount ?? 0).toFixed(2)}
                </Text>
              </View>
              <Pressable onPress={() => startEditingListing(draft)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Edit listing</Text>
              </Pressable>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => handleChangeListingStatus(draft.id, draft.status === 'Live' ? 'draft' : 'live')}
                  disabled={updatingListingStatus === draft.id}
                  style={[styles.primaryButton, styles.flexOne, updatingListingStatus === draft.id && styles.primaryButtonDisabled]}
                >
                  {updatingListingStatus === draft.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {draft.status === 'Live' ? 'Move to draft' : 'Publish live'}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => handleChangeListingStatus(draft.id, 'sold')}
                  disabled={updatingListingStatus === draft.id}
                  style={[styles.secondaryButton, styles.flexOne, updatingListingStatus === draft.id && styles.primaryButtonDisabled]}
                >
                  <Text style={styles.secondaryButtonText}>Mark sold</Text>
                </Pressable>
              </View>
            </>
          )}
          <Pressable
            onPress={() => handleDeleteListing(draft.id)}
            disabled={deletingListing === draft.id}
            style={[styles.dangerButton, deletingListing === draft.id && styles.primaryButtonDisabled]}
          >
            {deletingListing === draft.id ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Delete listing</Text>
            )}
          </Pressable>
        </View>
      )) : null}
    </View>
  );
}

function ProfileTab({
  configured,
  firebaseCheckResult,
  latestVerificationRequest,
  reviewQueue,
  onSaveProfile,
  linkedHatchPurchases,
  onFindLinkedHatchPurchases,
  onSubmitVerificationRequest,
  onReviewVerificationRequest,
  onRunFirebaseCheck,
  onSeedStarterData,
  onSignOut,
  lookingUpHatchPurchases,
  profile,
  reviewingVerificationRequest,
  runningFirebaseCheck,
  savingProfile,
  submittingVerificationRequest,
  seedingStarterData,
  user,
}: {
  configured: boolean;
  firebaseCheckResult: string | null;
  latestVerificationRequest: {
    businessType: 'farm' | 'hatchery' | 'trader';
    notes?: string;
    idDocumentReady: boolean;
    proofOfLocationReady: boolean;
    submittedAt: string;
    status: 'submitted' | 'approved';
  } | null;
  reviewQueue: Array<{
    id: string;
    userId: string;
    fullName: string;
    farmName?: string;
    phoneNumber: string;
    location: string;
    businessType: 'farm' | 'hatchery' | 'trader';
    notes?: string;
    submittedAt: string;
    status: 'submitted' | 'approved';
  }>;
  onSaveProfile: (input: FarmProfileInput) => Promise<void>;
  onSubmitVerificationRequest: (input: CreateSellerVerificationRequestInput) => Promise<void>;
  onReviewVerificationRequest: (input: ReviewSellerVerificationRequestInput) => Promise<void>;
  onRunFirebaseCheck: () => Promise<void>;
  onSeedStarterData: () => Promise<void>;
  onSignOut: () => Promise<void>;
    profile: {
      fullName: string;
      phoneNumber: string;
      location: string;
      roles: AppUserRole[];
      farmName?: string;
      experienceLevel?: 'beginner' | 'growing' | 'advanced';
      verificationStatus?: VerificationStatus;
      marketplaceContactPreference?: ContactPreference;
      meekyCartEmail?: string;
    } | null;
    linkedHatchPurchases: Array<{
      orderId: string;
      createdAt: string;
      status: string;
      paymentStatus: string;
      totalAmount: number;
      currency: string;
      items: Array<{
        id: string;
        title: string;
        quantity: number;
        price: number;
        variantName?: string | null;
      }>;
    }>;
    onFindLinkedHatchPurchases: (input?: { email?: string; phone?: string }) => Promise<unknown>;
    lookingUpHatchPurchases: boolean;
    reviewingVerificationRequest: string | null;
  runningFirebaseCheck: boolean;
  savingProfile: boolean;
  submittingVerificationRequest: boolean;
  seedingStarterData: boolean;
  user: {
    uid: string;
    isAnonymous: boolean;
    email?: string | null;
    displayName?: string | null;
    providerData: Array<{ providerId: string }>;
  } | null;
}) {
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [farmName, setFarmName] = useState(profile?.farmName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber ?? '+263');
  const [location, setLocation] = useState(profile?.location ?? 'Harare');
  const [meekyCartEmail, setMeekyCartEmail] = useState(profile?.meekyCartEmail ?? '');
  const [accountMode, setAccountMode] = useState<AccountMode>(rolesToAccountMode(profile?.roles));
  const [experienceLevel, setExperienceLevel] =
    useState<'beginner' | 'growing' | 'advanced'>(profile?.experienceLevel ?? 'beginner');
  const [marketplaceContactPreference, setMarketplaceContactPreference] = useState<ContactPreference>(
    profile?.marketplaceContactPreference ?? 'phone',
  );
  const isSellerFlow = accountMode === 'seller' || accountMode === 'both';
  const [verificationBusinessType, setVerificationBusinessType] =
    useState<CreateSellerVerificationRequestInput['businessType']>('farm');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [adminReviewNotes, setAdminReviewNotes] = useState<Record<string, string>>({});
  const [idDocumentReady, setIdDocumentReady] = useState(true);
  const [proofOfLocationReady, setProofOfLocationReady] = useState(true);
  const { configured: googleConfigured, error: googleError, loading: googleLoading, signInWithGoogle } =
    useGoogleAuth();
  const isAdmin = Boolean(profile?.roles?.includes('admin'));

  async function handleFirebaseCheck() {
    try {
      await onRunFirebaseCheck();
      Alert.alert('Firebase check complete', 'The rules test has finished. See the result card below.');
    } catch {
      Alert.alert('Firebase check failed', 'The app could not complete the Firestore rules check.');
    }
  }

  async function handleSeedStarterData() {
    try {
      await onSeedStarterData();
      Alert.alert('Starter data created', 'A starter batch, daily log, and listing draft were added.');
    } catch {
      Alert.alert('Seeding failed', 'The app could not create starter Firebase data.');
    }
  }

  async function handleSignOut() {
    try {
      await onSignOut();
      Alert.alert('Signed out', 'The app will create a fresh anonymous session if needed.');
    } catch {
      Alert.alert('Could not sign out', 'Please try again.');
    }
  }

  async function handleSaveProfile() {
    if (!fullName.trim()) {
      Alert.alert('Name needed', 'Please add your name before saving the profile.');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Location needed', 'Please add a location before saving the profile.');
      return;
    }

    try {
      await onSaveProfile({
        fullName,
        farmName,
        phoneNumber,
        location,
        roles: accountModeToRoles(accountMode),
        experienceLevel: isSellerFlow ? experienceLevel : undefined,
        marketplaceContactPreference: isSellerFlow ? marketplaceContactPreference : undefined,
        meekyCartEmail,
      });
      Alert.alert('Profile saved', 'Your farm profile has been updated.');
    } catch {
      Alert.alert('Could not save profile', 'Please try again.');
    }
  }

  async function handleLookupHatchPurchases() {
    try {
      await onFindLinkedHatchPurchases({
        email: meekyCartEmail,
        phone: phoneNumber,
      });
      Alert.alert(
        'Purchases checked',
        'We refreshed your MeekyCart hatch purchase history for this account.',
      );
    } catch {
      Alert.alert(
        'Lookup failed',
        'We could not find MeekyCart hatch purchases with those details yet.',
      );
    }
  }

  async function handleSubmitVerification() {
    try {
      await onSubmitVerificationRequest({
        businessType: verificationBusinessType,
        notes: verificationNotes,
        idDocumentReady,
        proofOfLocationReady,
      });
      Alert.alert('Verification submitted', 'Your seller verification request is now waiting for review.');
    } catch {
      Alert.alert('Could not submit verification', 'Please try again.');
    }
  }

  async function handleGoogleUpgrade() {
    try {
      await signInWithGoogle();
    } catch {
      Alert.alert('Google sign-in failed', 'Please try again in a moment.');
    }
  }

  async function handleApproveVerification(requestId: string, userId: string) {
    try {
      await onReviewVerificationRequest({
        requestId,
        userId,
        reviewNotes: adminReviewNotes[requestId],
      });
      Alert.alert('Verification approved', 'The seller can now appear as verified in the marketplace.');
    } catch {
      Alert.alert('Could not approve verification', 'Please try again.');
    }
  }

  return (
    <View style={styles.sectionStack}>
      <SectionTitle
        title="Account profile"
        subtitle="Choose whether this account is here to buy, hatch and sell, or do both."
      />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Marketplace status</Text>
        <Text style={styles.listText}>
          Verification status:{' '}
          {profile?.verificationStatus === 'verified'
            ? 'Verified'
            : profile?.verificationStatus === 'pending'
              ? 'Pending review'
              : 'Unverified'}
        </Text>
        <Text style={styles.listText}>
          Buyer contact: {marketplaceContactPreference === 'in-app' ? 'In-app chat' : 'Phone'}
        </Text>
        <Text style={styles.listText}>Payments stay offline between buyer and seller.</Text>
        <Text style={styles.listText}>These details now flow directly into each marketplace listing.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session and sign-in</Text>
        <Text style={styles.cardSubtitle}>
          Upgrade anonymous accounts to Google so hatch records and marketplace conversations stay tied to a recognizable identity.
        </Text>
        <Text style={styles.listText}>UID: {user?.uid ?? 'No signed-in user yet'}</Text>
        <Text style={styles.listText}>Name: {user?.displayName ?? 'Not set yet'}</Text>
        <Text style={styles.listText}>Email: {user?.email ?? 'Not set yet'}</Text>
        <Text style={styles.listText}>
          Providers: {user?.providerData?.map((provider) => provider.providerId).join(', ') || 'anonymous'}
        </Text>
        <View style={styles.infoResultCard}>
          <Text style={styles.fieldLabel}>Google sign-in status</Text>
          <Text style={styles.listText}>
            {googleConfigured
              ? user?.isAnonymous
                ? 'Google sign-in is ready. Upgrade this anonymous session when you want your account to follow a visible identity.'
                : 'This account is already linked beyond the anonymous starter session.'
              : 'Add the Google OAuth client IDs to your Expo env file to enable Google account upgrade on every device.'}
          </Text>
          {googleError ? <Text style={styles.listText}>Latest auth message: {googleError}</Text> : null}
        </View>
        {googleConfigured && user?.isAnonymous ? (
          <Pressable
            onPress={handleGoogleUpgrade}
            disabled={googleLoading}
            style={[styles.primaryButton, googleLoading && styles.primaryButtonDisabled]}
          >
            {googleLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Upgrade with Google</Text>
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile details</Text>
        <Text style={styles.cardSubtitle}>
          Keep your account identity current and change your role any time.
        </Text>

        <LabeledField label="How will you use MK Hatch Pilot?">
          <View style={styles.choiceRow}>
            {([
              ['buyer', 'Buyer only'],
              ['seller', 'Hatcher only'],
              ['both', 'Buyer and hatcher'],
            ] as const).map(([value, label]) => {
              const selected = value === accountMode;

              return (
                <Pressable
                  key={value}
                  onPress={() => setAccountMode(value)}
                  style={[styles.choiceChip, selected && styles.choiceChipActive]}
                >
                  <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </LabeledField>

        <LabeledField label="Your full name">
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Tapiwa Moyo"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
          />
        </LabeledField>
        {isSellerFlow ? (
          <LabeledField label="Farm or business name">
            <TextInput
              value={farmName}
              onChangeText={setFarmName}
              placeholder="Sunrise Poultry Farm"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />
          </LabeledField>
        ) : null}
        <View style={styles.formRow}>
          <LabeledField label="Phone" style={styles.flexOne}>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+263..."
              placeholderTextColor={colors.mutedText}
              style={styles.input}
            />
          </LabeledField>
          <LabeledField label="Location" style={styles.flexOne}>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Harare"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              />
            </LabeledField>
          </View>
          <LabeledField label="MeekyCart email for order linking">
            <TextInput
              value={meekyCartEmail}
              onChangeText={setMeekyCartEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </LabeledField>
          {isSellerFlow ? (
            <LabeledField label="Hatching experience">
            <View style={styles.choiceRow}>
              {([
                ['beginner', 'Beginner'],
                ['growing', 'Growing'],
                ['advanced', 'Advanced'],
              ] as const).map(([value, label]) => {
                const selected = value === experienceLevel;

                return (
                  <Pressable
                    key={value}
                    onPress={() => setExperienceLevel(value)}
                    style={[styles.choiceChip, selected && styles.choiceChipActive]}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </LabeledField>
        ) : null}
        {isSellerFlow ? (
          <LabeledField label="Buyer contact preference">
            <View style={styles.choiceRow}>
              {([
                ['phone', 'Phone'],
                ['in-app', 'In-app'],
              ] as const).map(([value, label]) => {
                const selected = value === marketplaceContactPreference;

                return (
                  <Pressable
                    key={value}
                    onPress={() => setMarketplaceContactPreference(value)}
                    style={[styles.choiceChip, selected && styles.choiceChipActive]}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </LabeledField>
        ) : null}
        <View style={styles.infoResultCard}>
          <Text style={styles.fieldLabel}>Verification status</Text>
          <View
            style={[
              styles.statusChip,
              profile?.verificationStatus === 'verified'
                ? styles.statusChipVerified
                : profile?.verificationStatus === 'pending'
                  ? styles.statusChipPending
                  : styles.statusChipMuted,
            ]}
          >
            <Text
              style={[
                styles.statusChipText,
                profile?.verificationStatus === 'verified'
                  ? styles.statusChipTextVerified
                  : profile?.verificationStatus === 'pending'
                    ? styles.statusChipTextPending
                    : styles.statusChipTextMuted,
              ]}
            >
              {profile?.verificationStatus === 'verified'
                ? '✓ Verified seller'
                : profile?.verificationStatus === 'pending'
                  ? '⏳ Verification pending'
                  : '○ Unverified seller'}
            </Text>
          </View>
          <Text style={styles.listText}>
            {isSellerFlow
              ? 'Complete farm name, phone, and location details move your seller profile into the verification queue.'
              : 'Buyer-only accounts do not need seller verification unless you later switch on selling.'}
          </Text>
        </View>
        {isSellerFlow ? (
          <View style={styles.infoResultCard}>
            <Text style={styles.fieldLabel}>Submit seller verification</Text>
            <View style={styles.choiceRow}>
              {([
                ['farm', 'Farm'],
                ['hatchery', 'Hatchery'],
                ['trader', 'Trader'],
              ] as const).map(([value, label]) => {
                const selected = value === verificationBusinessType;

                return (
                  <Pressable
                    key={value}
                    onPress={() => setVerificationBusinessType(value)}
                    style={[styles.choiceChip, selected && styles.choiceChipActive]}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.choiceRow}>
              <ToggleChip
                label={idDocumentReady ? 'ID ready' : 'ID not ready'}
                selected={idDocumentReady}
                onPress={() => setIdDocumentReady((current) => !current)}
              />
              <ToggleChip
                label={proofOfLocationReady ? 'Location proof ready' : 'Location proof not ready'}
                selected={proofOfLocationReady}
                onPress={() => setProofOfLocationReady((current) => !current)}
              />
            </View>
            <TextInput
              value={verificationNotes}
              onChangeText={setVerificationNotes}
              placeholder="Anything we should know about your hatch business?"
              placeholderTextColor={colors.mutedText}
              style={[styles.input, styles.multilineInput]}
              multiline
            />
            <Pressable
              onPress={handleSubmitVerification}
              disabled={submittingVerificationRequest}
              style={[styles.primaryButton, submittingVerificationRequest && styles.primaryButtonDisabled]}
            >
              {submittingVerificationRequest ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Submit verification request</Text>
              )}
            </Pressable>
            {latestVerificationRequest ? (
              <Text style={styles.listText}>
                Latest request: {latestVerificationRequest.businessType} •{' '}
                {new Date(latestVerificationRequest.submittedAt).toLocaleDateString()} •{' '}
                {latestVerificationRequest.status}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Pressable
          onPress={handleSaveProfile}
          disabled={savingProfile}
          style={[styles.primaryButton, savingProfile && styles.primaryButtonDisabled]}
        >
          {savingProfile ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Save farm profile</Text>
          )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>MeekyCart hatch purchases</Text>
          <Text style={styles.cardSubtitle}>
            Link incubators and hatch gear you already bought on MeekyCart using the same phone or email you used at checkout.
          </Text>
          <Pressable
            onPress={handleLookupHatchPurchases}
            disabled={lookingUpHatchPurchases}
            style={[styles.secondaryButton, lookingUpHatchPurchases && styles.primaryButtonDisabled]}
          >
            {lookingUpHatchPurchases ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.secondaryButtonText}>Find my hatch purchases</Text>
            )}
          </Pressable>
          {linkedHatchPurchases.length === 0 ? (
            <Text style={styles.listText}>
              No linked hatch purchases yet. Save your MeekyCart email above, then run the lookup when you are ready.
            </Text>
          ) : (
            <View style={styles.sectionStackTight}>
              {linkedHatchPurchases.map((purchase) => (
                <View key={purchase.orderId} style={styles.infoResultCard}>
                  <Text style={styles.cardTitle}>Order #{purchase.orderId.slice(0, 8)}</Text>
                  <Text style={styles.cardSubtitle}>
                    {new Date(purchase.createdAt).toLocaleDateString()} • {purchase.status} • {purchase.paymentStatus}
                  </Text>
                  <Text style={styles.listText}>
                    {purchase.currency} {purchase.totalAmount.toFixed(2)}
                  </Text>
                  {purchase.items.map((item) => (
                    <Text key={item.id} style={styles.listText}>
                      {item.title} x{item.quantity}
                      {item.variantName ? ` • ${item.variantName}` : ''}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>

        {isAdmin ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verification review queue</Text>
          <Text style={styles.cardSubtitle}>
            These are the seller verification requests waiting for a platform admin decision.
          </Text>
          {reviewQueue.length === 0 ? (
            <Text style={styles.listText}>No pending seller verification requests right now.</Text>
          ) : (
            <View style={styles.sectionStackTight}>
              {reviewQueue.map((request) => (
                <View key={request.id} style={styles.infoResultCard}>
                  <Text style={styles.cardTitle}>{request.farmName ?? request.fullName}</Text>
                  <Text style={styles.cardSubtitle}>
                    {request.businessType} • {request.location} • {new Date(request.submittedAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.listText}>Owner: {request.fullName}</Text>
                  <Text style={styles.listText}>Phone: {request.phoneNumber}</Text>
                  <Text style={styles.listText}>{request.notes ?? 'No extra review notes from the seller.'}</Text>
                  <TextInput
                    value={adminReviewNotes[request.id] ?? ''}
                    onChangeText={(value) =>
                      setAdminReviewNotes((current) => ({ ...current, [request.id]: value }))
                    }
                    placeholder="Optional admin note"
                    placeholderTextColor={colors.mutedText}
                    style={[styles.input, styles.multilineInput]}
                    multiline
                  />
                  <Pressable
                    onPress={() => handleApproveVerification(request.id, request.userId)}
                    disabled={reviewingVerificationRequest === request.id}
                    style={[
                      styles.primaryButton,
                      reviewingVerificationRequest === request.id && styles.primaryButtonDisabled,
                    ]}
                  >
                    {reviewingVerificationRequest === request.id ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Approve seller</Text>
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.cardSubtitle}>
          {user?.isAnonymous
            ? 'You are currently using an anonymous session. Upgrade it when you are ready, or sign out to start fresh.'
            : 'Your account is active and linked to a real identity.'}
        </Text>
        <Pressable onPress={handleSignOut} style={styles.dangerButton}>
          <Text style={styles.primaryButtonText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Firebase tools</Text>
        <Text style={styles.cardSubtitle}>
          {configured
            ? 'Run a quick rules check and seed starter records into your live Firebase project.'
            : 'These tools still work in demo mode, but the live checks need Firebase to be active.'}
        </Text>

        <Pressable
          onPress={handleFirebaseCheck}
          disabled={runningFirebaseCheck}
          style={[styles.secondaryButton, runningFirebaseCheck && styles.primaryButtonDisabled]}
        >
          {runningFirebaseCheck ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>Run Firebase rules check</Text>
          )}
        </Pressable>

        <Pressable
          onPress={handleSeedStarterData}
          disabled={seedingStarterData}
          style={[styles.primaryButton, seedingStarterData && styles.primaryButtonDisabled]}
        >
          {seedingStarterData ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Seed starter data</Text>
          )}
        </Pressable>

        {firebaseCheckResult ? (
          <View style={styles.infoResultCard}>
            <Text style={styles.fieldLabel}>Latest result</Text>
            <Text style={styles.listText}>{firebaseCheckResult}</Text>
          </View>
        ) : null}
        <View style={styles.infoResultCard}>
          <Text style={styles.fieldLabel}>Live Firebase checklist</Text>
          <Text style={styles.listText}>Publish the latest Firestore rules after new marketplace or candling features are added.</Text>
          <Text style={styles.listText}>Create any Firestore indexes the app or Firebase Console asks for during live browsing.</Text>
          <Text style={styles.listText}>Keep `savedMarketplaceListings`, `candlingRecords`, inquiries, and messages in sync with your live rules.</Text>
          <Text style={styles.listText}>If the top banner mentions permissions, it usually means setup is incomplete, not that the whole app is broken.</Text>
        </View>
      </View>
    </View>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function MiniAction({ label }: { label: string }) {
  return (
    <View style={styles.miniAction}>
      <Text style={styles.miniActionText}>{label}</Text>
    </View>
  );
}

function ToggleChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choiceChip, selected && styles.choiceChipActive]}
    >
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function EmptyStateCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyStateCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.listText}>{body}</Text>
    </View>
  );
}

function ShopHatchGearSection({
  loading,
  error,
  collectionName,
  collectionUrl,
  items,
  onOpenUrl,
}: {
  loading: boolean;
  error: string | null;
  collectionName: string;
  collectionUrl: string;
  items: Array<{
    id: string;
    title: string;
    description: string;
    price: number;
    currency: 'USD';
    imageUrl?: string | null;
    productUrl: string;
  }>;
  onOpenUrl: (url: string) => Promise<void>;
}) {
  const featuredItems = items.slice(0, 6);

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.flexOne}>
          <Text style={styles.cardTitle}>Shop Hatch Gear</Text>
          <Text style={styles.cardSubtitle}>
            Pull hatch products directly from the MeekyCart {collectionName} collection.
          </Text>
        </View>
        <Pressable onPress={() => void onOpenUrl(collectionUrl)} style={styles.linkButton}>
          <Text style={styles.linkButtonText}>Open collection</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : null}

      {error ? (
        <View style={styles.infoResultCard}>
          <Text style={styles.fieldLabel}>Store connection</Text>
          <Text style={styles.listText}>
            {error} The app is using a simple fallback so users can still jump into the hatch collection.
          </Text>
        </View>
      ) : null}

      {featuredItems.length === 0 ? (
        <Text style={styles.listText}>
          Hatch products will appear here as soon as the collection feed returns items.
        </Text>
      ) : (
        <View style={styles.sectionStackTight}>
          {featuredItems.map((item) => (
            <View key={item.id} style={styles.infoResultCard}>
              <View style={styles.rowBetween}>
                <View style={styles.flexOne}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>
                    {item.price > 0 ? `${item.currency} ${item.price.toFixed(2)}` : 'Open collection to view price'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => void onOpenUrl(item.productUrl)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>View</Text>
                </Pressable>
              </View>
              <Text style={styles.listText}>
                {item.description || 'Explore this MeekyCart hatch product.'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function LabeledField({
  label,
  style,
  children,
}: {
  label: string;
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={style}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centeredState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  centeredStateTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  centeredStateBody: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 360,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  kicker: {
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: colors.cardAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  infoBanner: {
    backgroundColor: colors.cardAlt,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  infoBannerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  infoBannerText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  onboardingContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 20,
  },
  onboardingHero: {
    gap: 10,
    paddingTop: 8,
  },
  onboardingTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  onboardingSubtitle: {
    color: colors.mutedText,
    fontSize: 16,
    lineHeight: 24,
  },
  sectionStack: {
    gap: 18,
  },
  sectionStackTight: {
    gap: 12,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  heroEyebrow: {
    color: '#D7E7D2',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#EAF4E6',
    fontSize: 15,
    lineHeight: 21,
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    padding: 12,
    gap: 6,
  },
  metricLabel: {
    color: '#D7E7D2',
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  actionStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniAction: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  miniActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroButton: {
    backgroundColor: '#F9F7F0',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  noticeCard: {
    backgroundColor: '#F9F7F0',
    borderRadius: 20,
    padding: 16,
    gap: 6,
  },
  noticeLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  noticeText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  marketplaceCard: {
    backgroundColor: colors.marketplaceSoft,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  checklistRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  checkMark: {
    color: colors.success,
    fontSize: 18,
    fontWeight: '800',
  },
  listText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  marketplaceTitle: {
    color: colors.marketplace,
    fontSize: 20,
    fontWeight: '800',
  },
  marketplaceText: {
    color: colors.marketplace,
    fontSize: 15,
    lineHeight: 22,
  },
  marketMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flexOne: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  choiceChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  choiceChipTextActive: {
    color: '#FFFFFF',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  imagePreviewCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    backgroundColor: colors.cardAlt,
  },
  multilineInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  dangerButton: {
    backgroundColor: colors.danger,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  infoResultCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  messageBubbleMine: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
  },
  messageBubbleOther: {
    backgroundColor: colors.cardAlt,
    borderColor: colors.border,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  statusChipVerified: {
    backgroundColor: colors.primarySoft,
  },
  statusChipPending: {
    backgroundColor: colors.accentSoft,
  },
  statusChipMuted: {
    backgroundColor: colors.cardAlt,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusChipTextVerified: {
    color: colors.primary,
  },
  statusChipTextPending: {
    color: colors.accent,
  },
  statusChipTextMuted: {
    color: colors.mutedText,
  },
  metaPill: {
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaPillText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyStateCard: {
    backgroundColor: colors.cardAlt,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  stagePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stagePillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  batchTask: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  marketBadge: {
    backgroundColor: '#FFF3E8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  marketBadgeText: {
    color: colors.marketplace,
    fontSize: 12,
    fontWeight: '800',
  },
  priceText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  linkButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  modalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalCloseText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  tabBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 18,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 3,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
});
