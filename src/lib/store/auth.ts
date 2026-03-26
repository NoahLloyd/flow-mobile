import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../../types";
import { api } from "../api";
import { supabase } from "../supabase";

const CACHED_USER_KEY = "cached_user";

async function cacheUser(user: User | null) {
  if (user) {
    await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(CACHED_USER_KEY);
  }
}

async function getCachedUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(CACHED_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      set({ loading: true });
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Try to fetch fresh profile, fall back to cached user
        try {
          const user = await api.getCurrentUser();
          await cacheUser(user);
          set({ user, initialized: true, loading: false });
        } catch {
          const cached = await getCachedUser();
          set({ user: cached, initialized: true, loading: false });
        }
      } else {
        set({ user: null, initialized: true, loading: false });
      }
    } catch {
      // Session fetch failed (offline) - use cached user
      const cached = await getCachedUser();
      set({ user: cached, initialized: true, loading: false });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        await cacheUser(null);
        set({ user: null });
      } else if (event === "SIGNED_IN" && session?.user) {
        try {
          const user = await api.getCurrentUser();
          await cacheUser(user);
          set({ user });
        } catch {
          // ignore
        }
      }
    });
  },

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const result = await api.login(email, password);
      const user = result.user as User;
      await cacheUser(user);
      set({ user, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ loading: true });
    try {
      const result = await api.register(name, email, password);
      const user = result.user as User;
      await cacheUser(user);
      set({ user, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    await api.logout();
    await cacheUser(null);
    set({ user: null });
  },

  refreshUser: async () => {
    try {
      const user = await api.getCurrentUser();
      await cacheUser(user);
      set({ user });
    } catch {
      // ignore
    }
  },
}));
