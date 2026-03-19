import { create } from "zustand";
import { User } from "../../types";
import { api } from "../api";
import { supabase } from "../supabase";

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
        const user = await api.getCurrentUser();
        set({ user, initialized: true, loading: false });
      } else {
        set({ user: null, initialized: true, loading: false });
      }
    } catch {
      set({ user: null, initialized: true, loading: false });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        set({ user: null });
      } else if (event === "SIGNED_IN" && session?.user) {
        try {
          const user = await api.getCurrentUser();
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
      set({ user: result.user as User, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ loading: true });
    try {
      const result = await api.register(name, email, password);
      set({ user: result.user as User, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    await api.logout();
    set({ user: null });
  },

  refreshUser: async () => {
    try {
      const user = await api.getCurrentUser();
      set({ user });
    } catch {
      // ignore
    }
  },
}));
