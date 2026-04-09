import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
  CreateBatchInput,
  CreateDailyLogInput,
  CreateMarketplaceListingInput,
  UpdateBatchInput,
  UpdateDailyLogInput,
  UpdateMarketplaceListingInput,
} from './types/models';

type TabKey = 'overview' | 'batches' | 'marketplace' | 'profile';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Today' },
  { key: 'batches', label: 'Batches' },
  { key: 'marketplace', label: 'Market' },
  { key: 'profile', label: 'Profile' },
];

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
    configured: googleConfigured,
    error: googleError,
    loading: googleLoading,
    signInWithGoogle,
  } = useGoogleAuth();
  const {
    status,
    loading: dataLoading,
    creatingBatch,
    creatingDailyLog,
    creatingListing,
    updatingBatch,
    updatingDailyLog,
    updatingListing,
    deletingBatch,
    deletingDailyLog,
    deletingListing,
    error,
    firebaseCheckResult,
    activeBatch,
    recentActiveBatchLog,
    batches,
    reminders,
    marketplaceDrafts,
    setupChecklist,
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
  const badgeLabel = configured
    ? sessionLoading || dataLoading
      ? 'Connecting Firebase'
      : 'Firebase live'
    : 'Demo mode';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>MK Hatch Pilot</Text>
          <Text style={styles.title}>From incubator to marketplace</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {configured ? (
          <View style={styles.infoBanner}>
            {sessionLoading || dataLoading ? <ActivityIndicator color={colors.primary} /> : null}
            <View style={styles.flexOne}>
              <Text style={styles.infoBannerTitle}>
                {user ? 'Connected to Firebase' : 'Preparing Firebase session'}
              </Text>
              <Text style={styles.infoBannerText}>
                {authError ?? error ?? `Signed in session: ${user?.uid ?? 'waiting for user'}`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.infoBanner}>
            <View style={styles.flexOne}>
              <Text style={styles.infoBannerTitle}>Firebase keys still needed</Text>
              <Text style={styles.infoBannerText}>
                Add your Expo public Firebase values to `.env` and the app will switch from demo
                data to live account data automatically.
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'overview' ? (
          <OverviewTab
            daysLeft={daysLeft}
            activeBatch={activeBatch}
            creatingDailyLog={creatingDailyLog}
            updatingDailyLog={updatingDailyLog}
            deletingDailyLog={deletingDailyLog}
            onCreateDailyLog={createDailyLog}
            onUpdateDailyLog={updateDailyLog}
            onDeleteDailyLog={deleteDailyLog}
            onDisableReminders={disableReminders}
            onEnableReminders={enableReminders}
            reminderLoading={reminderLoading}
            reminderStatusMessage={reminderStatusMessage}
            recentActiveBatchLog={recentActiveBatchLog}
            reminders={reminders}
            setupChecklist={setupChecklist}
            status={status}
          />
        ) : null}
        {activeTab === 'batches' ? (
          <BatchesTab
            batches={batches}
            creatingBatch={creatingBatch}
            updatingBatch={updatingBatch}
            deletingBatch={deletingBatch}
            onCreateBatch={createBatch}
            onUpdateBatch={updateBatch}
            onDeleteBatch={deleteBatch}
            status={status}
          />
        ) : null}
        {activeTab === 'marketplace' ? (
          <MarketplaceTab
            activeBatch={activeBatch}
            creatingListing={creatingListing}
            updatingListing={updatingListing}
            deletingListing={deletingListing}
            marketplaceDrafts={marketplaceDrafts}
            onCreateListing={createMarketplaceListing}
            onUpdateListing={updateMarketplaceListing}
            onDeleteListing={deleteMarketplaceListing}
          />
        ) : null}
        {activeTab === 'profile' ? (
          <ProfileTab
            configured={configured}
            googleConfigured={googleConfigured}
            googleError={googleError}
            googleLoading={googleLoading}
            firebaseCheckResult={firebaseCheckResult}
            onGoogleSignIn={signInWithGoogle}
            onRunFirebaseCheck={runFirebaseCheck}
            onSeedStarterData={seedStarterData}
            onSignOut={signOutUser}
            runningFirebaseCheck={runningFirebaseCheck}
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
              <Text
                style={[styles.tabLabel, selected && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function OverviewTab({
  daysLeft,
  activeBatch,
  creatingDailyLog,
  updatingDailyLog,
  deletingDailyLog,
  onCreateDailyLog,
  onUpdateDailyLog,
  onDeleteDailyLog,
  onDisableReminders,
  onEnableReminders,
  reminderLoading,
  reminderStatusMessage,
  recentActiveBatchLog,
  reminders,
  setupChecklist,
  status,
}: {
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
  } | null;
  creatingDailyLog: boolean;
  updatingDailyLog: string | null;
  deletingDailyLog: string | null;
  onCreateDailyLog: (input: CreateDailyLogInput) => Promise<void>;
  onUpdateDailyLog: (input: UpdateDailyLogInput) => Promise<void>;
  onDeleteDailyLog: (logId: string) => Promise<void>;
  onDisableReminders: (batchId: string) => Promise<void>;
  onEnableReminders: (batch: {
    id: string;
    name: string;
    eggType: string;
    currentDay: number;
    totalDays: number;
    startDate?: string;
    expectedHatchDate?: string;
  }) => Promise<{ count: number; message: string } | void>;
  reminderLoading: boolean;
  reminderStatusMessage: string | null;
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
  reminders: DashboardReminder[];
  setupChecklist: string[];
  status: 'demo' | 'live';
}) {
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
      const result = await onEnableReminders(activeBatch);
      Alert.alert('Reminders enabled', result?.message ?? 'Batch reminders were scheduled.');
    } catch (reminderError) {
      Alert.alert(
        'Could not enable reminders',
        reminderError instanceof Error ? reminderError.message : 'Please try again on a physical device.',
      );
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

          <View style={styles.actionStrip}>
            <MiniAction label={`Temp ${activeBatch.targetTemp}`} />
            <MiniAction label={`Humidity ${activeBatch.targetHumidity}`} />
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeLabel}>Next action</Text>
            <Text style={styles.noticeText}>{activeBatch.nextTask}</Text>
          </View>
        </View>
      ) : (
        <EmptyStateCard
          title="No active batch yet"
          body="Create your first hatch batch in the Batches tab and the daily dashboard will come alive here."
        />
      )}

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
            Schedule local notifications for daily logs, turning, lockdown, and hatch day.
          </Text>
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

      <SectionTitle title="Setup wizard" subtitle="New incubator buyers get guided confidence before loading eggs." />
      <View style={styles.card}>
        {setupChecklist.map((item) => (
          <View key={item} style={styles.checklistRow}>
            <Text style={styles.checkMark}>✓</Text>
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>

      <SectionTitle title="Marketplace handoff" subtitle="The same app should help users sell once chicks hatch." />
      <View style={[styles.card, styles.marketplaceCard]}>
        <Text style={styles.marketplaceTitle}>Turn hatch results into listings</Text>
        <Text style={styles.marketplaceText}>
          When the hatch is complete, the app can prefill a listing with chick type, quantity,
          hatch date, location, and asking price.
        </Text>
      </View>
    </View>
  );
}

function BatchesTab({
  batches,
  creatingBatch,
  updatingBatch,
  deletingBatch,
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
  }>;
  creatingBatch: boolean;
  updatingBatch: string | null;
  deletingBatch: string | null;
  onCreateBatch: (input: CreateBatchInput) => Promise<void>;
  onUpdateBatch: (input: UpdateBatchInput) => Promise<void>;
  onDeleteBatch: (batchId: string) => Promise<void>;
  status: 'demo' | 'live';
}) {
  const [eggType, setEggType] = useState<CreateBatchInput['eggType']>('Chicken');
  const [incubatorName, setIncubatorName] = useState('Meeky Smart Incubator');
  const [quantity, setQuantity] = useState('30');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingEggType, setEditingEggType] = useState<CreateBatchInput['eggType']>('Chicken');
  const [editingIncubatorName, setEditingIncubatorName] = useState('');
  const [editingQuantity, setEditingQuantity] = useState('');
  const [editingStartDate, setEditingStartDate] = useState('');

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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create a new hatch batch</Text>
        <Text style={styles.cardSubtitle}>
          {status === 'live'
            ? 'Save a real batch to Firestore and drive the dashboard from live data.'
            : 'This works in demo mode too, so we can keep building the full flow before everything is live.'}
        </Text>

        <View style={styles.choiceRow}>
          {(['Chicken', 'Quail', 'Duck'] as const).map((option) => {
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

      {batches.length === 0 ? (
        <EmptyStateCard
          title="No batches yet"
          body="Your saved hatch batches will appear here once you create the first one."
        />
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
                {(['Chicken', 'Quail', 'Duck'] as const).map((option) => {
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
    </View>
  );
}

function MarketplaceTab({
  activeBatch,
  creatingListing,
  updatingListing,
  deletingListing,
  marketplaceDrafts,
  onCreateListing,
  onUpdateListing,
  onDeleteListing,
}: {
  activeBatch: {
    id: string;
    eggType: string;
  } | null;
  creatingListing: boolean;
  updatingListing: string | null;
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
  }>;
  onCreateListing: (input: CreateMarketplaceListingInput) => Promise<void>;
  onUpdateListing: (input: UpdateMarketplaceListingInput) => Promise<void>;
  onDeleteListing: (listingId: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(`${activeBatch?.eggType ?? 'Chicken'} chicks`);
  const [category, setCategory] = useState<CreateMarketplaceListingInput['category']>('chicks');
  const [quantity, setQuantity] = useState('12');
  const [price, setPrice] = useState('1.20');
  const [location, setLocation] = useState('Harare');
  const [imageAssetUri, setImageAssetUri] = useState<string | null>(null);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingCategory, setEditingCategory] =
    useState<CreateMarketplaceListingInput['category']>('chicks');
  const [editingQuantity, setEditingQuantity] = useState('');
  const [editingPrice, setEditingPrice] = useState('');
  const [editingLocation, setEditingLocation] = useState('');
  const [editingImageAssetUri, setEditingImageAssetUri] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | undefined>(undefined);

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
        imageAssetUri: imageAssetUri ?? undefined,
      });
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
        imageAssetUri: editingImageAssetUri ?? undefined,
        existingImageUrl: editingImageUrl,
      });
      setEditingListingId(null);
      Alert.alert('Listing updated', 'The marketplace draft was updated.');
    } catch {
      Alert.alert('Could not update listing', 'Please try again.');
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

      {marketplaceDrafts.length === 0 ? (
        <EmptyStateCard
          title="No listing drafts yet"
          body="Once you create a marketplace listing draft, it will show up here ready for review."
        />
      ) : null}

      {marketplaceDrafts.map((draft) => (
        <View key={draft.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.flexOne}>
              <Text style={styles.cardTitle}>{draft.title}</Text>
              <Text style={styles.cardSubtitle}>
                {draft.location} • {draft.quantity} available
              </Text>
            </View>
            <View style={styles.marketBadge}>
              <Text style={styles.marketBadgeText}>{draft.status}</Text>
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
                Listing flow should be prefilled from hatch results to save time and improve seller
                conversion.
              </Text>
              <Pressable onPress={() => startEditingListing(draft)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Edit listing</Text>
              </Pressable>
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
      ))}
    </View>
  );
}

function ProfileTab({
  configured,
  googleConfigured,
  googleError,
  googleLoading,
  firebaseCheckResult,
  onGoogleSignIn,
  onRunFirebaseCheck,
  onSeedStarterData,
  onSignOut,
  runningFirebaseCheck,
  seedingStarterData,
  user,
}: {
  configured: boolean;
  googleConfigured: boolean;
  googleError: string | null;
  googleLoading: boolean;
  firebaseCheckResult: string | null;
  onGoogleSignIn: () => Promise<void>;
  onRunFirebaseCheck: () => Promise<void>;
  onSeedStarterData: () => Promise<void>;
  onSignOut: () => Promise<void>;
  runningFirebaseCheck: boolean;
  seedingStarterData: boolean;
  user: {
    uid: string;
    isAnonymous: boolean;
    email?: string | null;
    displayName?: string | null;
    providerData: Array<{ providerId: string }>;
  } | null;
}) {
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

  async function handleGoogleSignIn() {
    try {
      await onGoogleSignIn();
    } catch {
      Alert.alert('Google sign-in failed', 'Please check the Google client IDs and try again.');
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

  return (
    <View style={styles.sectionStack}>
      <SectionTitle
        title="Business profile"
        subtitle="A future home for farm identity, incubator ownership, and payouts."
      />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>What lives here later</Text>
        <Text style={styles.listText}>Buyer account linked to MeekyCart purchases</Text>
        <Text style={styles.listText}>Farm location and seller verification</Text>
        <Text style={styles.listText}>Notification preferences and payout setup</Text>
        <Text style={styles.listText}>Performance history across all batches</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.cardSubtitle}>
          {user?.isAnonymous
            ? 'You are currently using an anonymous session. Upgrade it so your data stays tied to a visible account.'
            : 'Your account is active and linked to a real identity.'}
        </Text>
        <Text style={styles.listText}>UID: {user?.uid ?? 'No signed-in user yet'}</Text>
        <Text style={styles.listText}>Name: {user?.displayName ?? 'Not set yet'}</Text>
        <Text style={styles.listText}>Email: {user?.email ?? 'Not set yet'}</Text>
        <Text style={styles.listText}>
          Providers: {user?.providerData?.map((provider) => provider.providerId).join(', ') || 'anonymous'}
        </Text>

        <Pressable
          onPress={handleGoogleSignIn}
          disabled={!googleConfigured || googleLoading}
          style={[styles.secondaryButton, (!googleConfigured || googleLoading) && styles.primaryButtonDisabled]}
        >
          {googleLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>
              {googleConfigured ? 'Upgrade with Google' : 'Google sign-in needs client IDs'}
            </Text>
          )}
        </Pressable>

        {googleError ? (
          <View style={styles.infoResultCard}>
            <Text style={styles.fieldLabel}>Google sign-in</Text>
            <Text style={styles.listText}>{googleError}</Text>
          </View>
        ) : null}

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
    maxWidth: 220,
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
  sectionStack: {
    gap: 18,
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
    paddingVertical: 12,
    alignItems: 'center',
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
