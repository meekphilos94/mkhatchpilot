import { useState } from 'react';

import type { ReminderBatch } from '../lib/notifications';
import type { ReminderPreferences } from '../types/models';

export function useBatchReminders() {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function enableReminders(batch: ReminderBatch, preferences?: ReminderPreferences) {
    setLoading(true);

    try {
      const { requestNotificationAccess, scheduleBatchReminders } = await import(
        '../lib/notifications'
      );
      const access = await requestNotificationAccess();

      if (!access.granted) {
        setStatusMessage(access.message);
        throw new Error(access.message);
      }

      const result = await scheduleBatchReminders(batch, preferences);
      setStatusMessage(result.message);
      return result;
    } finally {
      setLoading(false);
    }
  }

  async function disableReminders(batchId: string) {
    setLoading(true);

    try {
      const { cancelBatchReminders } = await import('../lib/notifications');
      await cancelBatchReminders(batchId);
      setStatusMessage('Reminders cancelled for this batch.');
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    statusMessage,
    enableReminders,
    disableReminders,
  };
}
