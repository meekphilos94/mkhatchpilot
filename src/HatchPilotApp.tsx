import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DashboardReminder } from './data/mockData';
import { useAppData } from './hooks/useAppData';
import { useFirebaseSession } from './providers/FirebaseProvider';
import { colors } from './theme';

type TabKey = 'overview' | 'batches' | 'marketplace' | 'profile';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Today' },
  { key: 'batches', label: 'Batches' },
  { key: 'marketplace', label: 'Market' },
  { key: 'profile', label: 'Profile' },
];

export function HatchPilotApp() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const { configured, loading: sessionLoading, authError, user } = useFirebaseSession();
  const {
    status,
    loading: dataLoading,
    error,
    activeBatch,
    batches,
    reminders,
    marketplaceDrafts,
    setupChecklist,
  } = useAppData();
  const daysLeft = useMemo(
    () => activeBatch.totalDays - activeBatch.currentDay,
    [activeBatch.currentDay, activeBatch.totalDays],
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
            reminders={reminders}
            setupChecklist={setupChecklist}
            status={status}
          />
        ) : null}
        {activeTab === 'batches' ? <BatchesTab batches={batches} /> : null}
        {activeTab === 'marketplace' ? (
          <MarketplaceTab marketplaceDrafts={marketplaceDrafts} />
        ) : null}
        {activeTab === 'profile' ? <ProfileTab /> : null}
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
  };
  reminders: DashboardReminder[];
  setupChecklist: string[];
  status: 'demo' | 'live';
}) {
  return (
    <View style={styles.sectionStack}>
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
  }>;
}) {
  return (
    <View style={styles.sectionStack}>
      <SectionTitle
        title="Batch manager"
        subtitle="Each batch tracks stage, targets, and the next critical task."
      />
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
          <View style={styles.heroMetrics}>
            <MetricCard label="Day" value={`${batch.currentDay}/${batch.totalDays}`} />
            <MetricCard label="Temp" value={batch.targetTemp} />
            <MetricCard label="Humidity" value={batch.targetHumidity} />
          </View>
          <Text style={styles.batchTask}>{batch.nextTask}</Text>
        </View>
      ))}
    </View>
  );
}

function MarketplaceTab({
  marketplaceDrafts,
}: {
  marketplaceDrafts: Array<{
    id: string;
    title: string;
    location: string;
    quantity: number;
    price: string;
    status: string;
  }>;
}) {
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
          <Text style={styles.priceText}>{draft.price}</Text>
          <Text style={styles.listText}>
            Listing flow should be prefilled from hatch results to save time and improve seller
            conversion.
          </Text>
        </View>
      ))}
    </View>
  );
}

function ProfileTab() {
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
