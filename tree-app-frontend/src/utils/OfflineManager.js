import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const QUEUE_KEY = '@tree_logs_queue';

/**
 * Adds a tree log to the offline queue.
 * Handles FormData mapping since FormData cannot be serialized directly to JSON.
 */
export const queueTreeLog = async (logData) => {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = queueJson ? JSON.parse(queueJson) : [];

    // Add unique ID for tracking
    const newLog = {
      ...logData,
      _queueId: Date.now().toString(),
      queuedAt: new Date().toISOString(),
    };

    queue.push(newLog);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[OfflineManager] Log queued. Total in queue: ${queue.length}`);
    return true;
  } catch (error) {
    console.error('[OfflineManager] Error queuing log:', error);
    return false;
  }
};

/**
 * Attempts to sync all queued logs to the server.
 */
export const syncOfflineLogs = async () => {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    if (!queueJson) return 0;

    const queue = JSON.parse(queueJson);
    if (queue.length === 0) return 0;

    console.log(`[OfflineManager] Attempting to sync ${queue.length} logs...`);
    
    let syncedCount = 0;
    const failedQueue = [];

    for (const log of queue) {
      try {
        // Reconstruct FormData
        const formData = new FormData();
        
        if (log.photoUri) {
          formData.append('photo', {
            uri: log.photoUri,
            name: 'tree.jpg',
            type: 'image/jpeg',
          });
        }
        
        if (log.speciesId) formData.append('speciesId', log.speciesId);
        if (log.count) formData.append('count', String(log.count));
        if (log.rawGuess) formData.append('rawGuess', log.rawGuess);
        if (log.aiConfidence) formData.append('aiConfidence', String(log.aiConfidence));
        if (log.latitude) formData.append('latitude', String(log.latitude));
        if (log.longitude) formData.append('longitude', String(log.longitude));

        // Attempt upload
        try {
          await api.post('/tree-logs', formData, {
            timeout: 30000,
          });
        } catch (uploadErr) {
          // If upload with photo failed (e.g. temporary camera cache file was purged by OS),
          // retry uploading tree log metadata as JSON so the record is never lost
          console.warn(`[OfflineManager] Photo upload failed for ${log._queueId}, retrying metadata as JSON:`, uploadErr.message);
          await api.post('/tree-logs', {
            speciesId: log.speciesId || undefined,
            count: log.count ? Number(log.count) : 1,
            rawGuess: log.rawGuess || undefined,
            aiConfidence: log.aiConfidence ? Number(log.aiConfidence) : undefined,
            latitude: log.latitude ? Number(log.latitude) : undefined,
            longitude: log.longitude ? Number(log.longitude) : undefined,
          });
        }

        syncedCount++;
        console.log(`[OfflineManager] Successfully synced log ${log._queueId}`);
      } catch (error) {
        console.log(`[OfflineManager] Failed to sync log ${log._queueId}:`, error.message, error.response?.data || '');
        const retries = (log.retryCount || 0) + 1;
        if (retries < 4) {
          failedQueue.push({ ...log, retryCount: retries });
        } else {
          console.warn(`[OfflineManager] Expired log ${log._queueId} after ${retries} attempts.`);
        }
      }
    }

    // Save remaining (failed) items back to queue
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedQueue));
    return syncedCount;
  } catch (error) {
    console.error('[OfflineManager] Sync error:', error);
    return 0;
  }
};

/**
 * Returns the number of items currently in the queue.
 */
export const getQueueCount = async () => {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = queueJson ? JSON.parse(queueJson) : [];
    return queue.length;
  } catch {
    return 0;
  }
};
