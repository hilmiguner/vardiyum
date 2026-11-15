import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  REMINDER_OWNER,
  type ReminderPlanItem,
  type ReminderSchedulerPort,
} from '../domain/routine-reminders';

const CHANNEL_ID = 'vardiyum-routines';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const notificationPort: ReminderSchedulerPort = {
  async list() {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    return pending.map((entry) => ({
      identifier: entry.identifier,
      owner: typeof entry.content.data?.owner === 'string'
        ? entry.content.data.owner : undefined,
      key: typeof entry.content.data?.key === 'string'
        ? entry.content.data.key : undefined,
    }));
  },
  async schedule(item: ReminderPlanItem) {
    return Notifications.scheduleNotificationAsync({
      content: {
        title: 'Vardiyum',
        body: item.title,
        data: {
          owner: REMINDER_OWNER,
          key: item.key,
          routineId: item.routineId,
          localDate: item.localDate,
          ruleRevision: item.ruleRevision,
          timeZone: item.timeZone,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(item.whenUtc),
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
  },
  async cancel(identifier: string) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  },
};

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rutin hatırlatmaları',
      description: 'Vardiyaya bağlı kişisel rutin görevleri',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180],
    });
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  const status = await Notifications.getPermissionsAsync();
  return isUsablePermission(status);
}

function isUsablePermission(status: Notifications.NotificationPermissionsStatus): boolean {
  if (status.granted) return true;
  if (Platform.OS !== 'ios') return false;
  const ios = status.ios?.status;
  return ios === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    ios === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    ios === Notifications.IosAuthorizationStatus.EPHEMERAL;
}

/**
 * Only call this from a direct "Enable reminders" user interaction.
 * The root coordinator never requests permissions automatically.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  await ensureChannel();
  const status = await Notifications.getPermissionsAsync();
  if (isUsablePermission(status)) return true;
  const response = await Notifications.requestPermissionsAsync();
  return isUsablePermission(response);
}

export async function prepareReminderChannel(): Promise<void> {
  await ensureChannel();
}
