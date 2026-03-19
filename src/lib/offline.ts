import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
}

const QUEUE_KEY = "offline_queue";

let isProcessing = false;

export const offlineQueue = {
  add: async (type: string, payload: any) => {
    const queue = await offlineQueue.getAll();
    const action: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      payload,
      timestamp: Date.now(),
    };
    queue.push(action);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return action;
  },

  getAll: async (): Promise<QueuedAction[]> => {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  remove: async (id: string) => {
    const queue = await offlineQueue.getAll();
    const filtered = queue.filter((a) => a.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  },

  clear: async () => {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },

  processQueue: async (executor: (action: QueuedAction) => Promise<void>) => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const queue = await offlineQueue.getAll();
      for (const action of queue) {
        try {
          await executor(action);
          await offlineQueue.remove(action.id);
        } catch (error) {
          // If it fails, leave it in the queue for next retry
          console.log("[offline] Failed to process action:", action.type, error);
          break; // Stop processing to maintain order
        }
      }
    } finally {
      isProcessing = false;
    }
  },
};

// Network state monitoring
export function setupNetworkListener(
  onOnline: () => void,
  onOffline: () => void
) {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      onOnline();
    } else {
      onOffline();
    }
  });
}

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!state.isConnected;
}
