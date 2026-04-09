import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_STORAGE_PREFIX = '@mk-hatch-pilot/reminders/';
const REMINDER_CHANNEL_ID = 'hatch-reminders';

export interface ReminderBatch {
  id: string;
  name: string;
  eggType: string;
  currentDay: number;
  totalDays: number;
  startDate?: string;
  expectedHatchDate?: string;
}

export async function requestNotificationAccess() {
  if (!Device.isDevice) {
    return { granted: false, message: 'Reminders need a physical device or supported build.' };
  }

  const existing = await Notifications.getPermissionsAsync();

  if (existing.granted) {
    await configureReminderChannel();
    return { granted: true, message: 'Notification access already granted.' };
  }

  const requested = await Notifications.requestPermissionsAsync();

  if (!requested.granted) {
    return { granted: false, message: 'Notification permission was not granted.' };
  }

  await configureReminderChannel();
  return { granted: true, message: 'Notification permission granted.' };
}

async function configureReminderChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Hatch reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#C97C42',
  });
}

function buildReminderStorageKey(batchId: string) {
  return `${REMINDER_STORAGE_PREFIX}${batchId}`;
}

async function persistReminderIds(batchId: string, ids: string[]) {
  await AsyncStorage.setItem(buildReminderStorageKey(batchId), JSON.stringify(ids));
}

async function getReminderIds(batchId: string) {
  const raw = await AsyncStorage.getItem(buildReminderStorageKey(batchId));
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function cancelBatchReminders(batchId: string) {
  const ids = await getReminderIds(batchId);

  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await AsyncStorage.removeItem(buildReminderStorageKey(batchId));
}

function createDateAtHour(dateLike: string, hour: number, minute: number) {
  const date = new Date(dateLike);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function getLockdownDate(batch: ReminderBatch) {
  const hatchDate = batch.expectedHatchDate
    ? new Date(batch.expectedHatchDate)
    : createDateAtHour(new Date().toISOString(), 8, 0);
  hatchDate.setDate(hatchDate.getDate() - 3);
  hatchDate.setHours(9, 0, 0, 0);
  return hatchDate;
}

async function scheduleOneTimeReminder(title: string, body: string, date: Date) {
  if (date.getTime() <= Date.now()) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: REMINDER_CHANNEL_ID,
    },
  });
}

async function scheduleDailyReminder(title: string, body: string, hour: number, minute: number) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: REMINDER_CHANNEL_ID,
    },
  });
}

export async function scheduleBatchReminders(batch: ReminderBatch) {
  await cancelBatchReminders(batch.id);

  const permission = await requestNotificationAccess();

  if (!permission.granted) {
    throw new Error(permission.message);
  }

  const ids = await Promise.all([
    scheduleDailyReminder(
      'Log your hatch batch',
      `Record temperature and humidity for ${batch.name} this morning.`,
      7,
      0,
    ),
    scheduleDailyReminder(
      'Turn the eggs',
      `Check whether ${batch.name} needs turning and water top-up today.`,
      13,
      0,
    ),
    scheduleOneTimeReminder(
      'Lockdown starts soon',
      `${batch.name} enters lockdown soon. Raise humidity and stop turning the eggs.`,
      getLockdownDate(batch),
    ),
    scheduleOneTimeReminder(
      'Hatch window is here',
      `${batch.name} is due to hatch. Keep the incubator closed and monitor closely.`,
      batch.expectedHatchDate
        ? createDateAtHour(batch.expectedHatchDate, 8, 0)
        : createDateAtHour(new Date().toISOString(), 8, 0),
    ),
  ]);

  const validIds = ids.filter((id): id is string => Boolean(id));
  await persistReminderIds(batch.id, validIds);

  return {
    count: validIds.length,
    message: `Scheduled ${validIds.length} reminders for ${batch.name}.`,
  };
}
