import { useState } from 'react';

import {
  ReminderBatch,
  cancelBatchReminders,
  requestNotificationAccess,
  scheduleBatchReminders,
} from '../lib/notifications';

export function useBatchReminders() {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function enableReminders(batch: ReminderBatch) {
    setLoading(true);

    try {
      const access = await requestNotificationAccess();

      if (!access.granted) {
        setStatusMessage(access.message);
        throw new Error(access.message);
      }

      const result = await scheduleBatchReminders(batch);
      setStatusMessage(result.message);
      return result;
    } finally {
      setLoading(false);
    }
  }

  async function disableReminders(batchId: string) {
    setLoading(true);

    try {
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
