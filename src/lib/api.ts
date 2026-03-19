import { Session } from "../types";
import { MorningEntry, MorningEntries } from "../types";
import { Task } from "../types";
import { User } from "../types";
import { Note } from "../types";
import { supabase, getCurrentUserId } from "./supabase";

// ── Helpers ─────────────────────────────────────────────────

function calculateWritingStreak(entries: MorningEntry[]): number {
  const validEntries = entries.filter((entry) => {
    const writing =
      (entry.activityContent as Record<string, any>)?.writing || "";
    return writing.length >= 1000;
  });

  if (validEntries.length === 0) return 0;

  const entryDates = validEntries
    .map((e) => e.date)
    .sort()
    .reverse();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let lastDate: Date | null = null;

  for (const dateStr of entryDates) {
    const date = new Date(dateStr + "T00:00:00");
    if (lastDate === null) {
      if (date > today) continue;
      const diffDays = Math.floor(
        (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays <= 1) {
        streak = 1;
        lastDate = date;
      } else {
        break;
      }
    } else {
      const diffDays = Math.floor(
        (lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) {
        streak++;
        lastDate = date;
      } else {
        break;
      }
    }
  }

  return streak;
}

// ── API ─────────────────────────────────────────────────────

export const api = {
  // ─── Auth ────────────────────────────────────────────────

  login: async (email: string, password: string) => {
    console.log("[auth] login attempt for:", email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      console.log("[auth] login error:", error.message, error.status);
      throw new Error(error.message);
    }
    console.log("[auth] login success, user:", data.user.id);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      console.log("[auth] profile fetch error:", profileError.message);
    }

    return {
      access_token: data.session.access_token,
      token_type: "bearer",
      user: {
        id: data.user.id,
        name: profile?.name || data.user.user_metadata?.name || "",
        email: data.user.email || "",
        picture_url: profile?.picture_url,
        preferences: profile?.preferences || {},
        created_at: profile?.created_at,
        updated_at: profile?.updated_at,
      },
    };
  },

  register: async (name: string, email: string, password: string) => {
    console.log("[auth] register attempt for:", email);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name } },
    });
    if (error) {
      console.log("[auth] register error:", error.message, error.status);
      throw new Error(error.message);
    }
    console.log("[auth] register result:", {
      hasSession: !!data.session,
      hasUser: !!data.user,
      userId: data.user?.id,
    });

    // If email confirmation is required, session will be null
    if (!data.session) {
      throw new Error(
        "Check your email to confirm your account before signing in."
      );
    }

    return {
      access_token: data.session.access_token,
      token_type: "bearer",
      user: {
        id: data.user!.id,
        name,
        email,
        preferences: {},
      },
    };
  },

  getCurrentUser: async (): Promise<User> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Not authenticated");

    const user = session.user;
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      name: profile?.name || "",
      email: user.email || "",
      picture_url: profile?.picture_url,
      preferences: profile?.preferences || {},
      created_at: profile?.created_at,
      updated_at: profile?.updated_at,
    };
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  // ─── Sessions ─────────────────────────────────────────────

  getUserSessions: async (): Promise<Session[]> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10000);
    if (error) throw error;
    return data || [];
  },

  submitSession: async (
    sessionData: Omit<Session, "id" | "user_id">
  ): Promise<Session> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        notes: sessionData.notes || "",
        task: sessionData.task || "",
        project: sessionData.project || "",
        minutes: sessionData.minutes,
        focus: sessionData.focus,
        created_at: sessionData.created_at || new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateSession: async (
    sessionId: string,
    updates: Partial<Session>
  ): Promise<Session> => {
    const { id, user_id, ...safeUpdates } = updates as any;
    const { data, error } = await supabase
      .from("sessions")
      .update(safeUpdates)
      .eq("id", sessionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteSession: async (sessionId: string) => {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId);
    if (error) throw error;
  },

  getSessionsByDateRange: async (
    startISO: string,
    endISO: string
  ): Promise<Session[]> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", startISO)
      .lte("created_at", endISO)
      .limit(10000);
    if (error) throw error;
    return (data || []) as Session[];
  },

  // ─── Tasks ────────────────────────────────────────────────

  getUserTasks: async (): Promise<Task[]> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .limit(10000);
    if (error) throw error;
    return (data || []).map((t: any) => ({
      ...t,
      completedAt: t.completed_at ? new Date(t.completed_at) : null,
      createdAt: new Date(t.created_at),
    }));
  },

  createTask: async (taskData: {
    title: string;
    type: string;
  }): Promise<Task> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: taskData.title,
        type: taskData.type,
        completed: false,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      ...data,
      completedAt: data.completed_at ? new Date(data.completed_at) : null,
      createdAt: new Date(data.created_at),
    };
  },

  updateTask: async (
    taskId: string,
    updates: Partial<Task>
  ): Promise<Task> => {
    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.completed !== undefined) {
      dbUpdates.completed = updates.completed;
      dbUpdates.completed_at = updates.completed
        ? new Date().toISOString()
        : null;
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(dbUpdates)
      .eq("id", taskId)
      .select()
      .single();
    if (error) throw error;
    return {
      ...data,
      completedAt: data.completed_at ? new Date(data.completed_at) : null,
      createdAt: new Date(data.created_at),
    };
  },

  deleteTask: async (taskId: string): Promise<void> => {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);
    if (error) throw error;
  },

  // ─── Morning / Writing ───────────────────────────────────

  getAllEntries: async (): Promise<MorningEntries> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("writings")
      .select("*")
      .eq("user_id", userId)
      .limit(10000);
    if (error) throw error;

    const entries: MorningEntry[] = (data || []).map((w: any) => ({
      date: w.date,
      content: "",
      user_id: w.user_id,
      activityContent: w.activity_content || {},
    }));

    const streak = calculateWritingStreak(entries);
    return { entries, streak };
  },

  getEntry: async (
    date: string
  ): Promise<{ content: string; activityContent?: any }> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("writings")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      return { content: "", activityContent: {} };
    }
    return {
      content: "",
      activityContent: data.activity_content || {},
    };
  },

  updateEntry: async (
    date: string,
    content: string,
    activityContent?: any
  ): Promise<void> => {
    const userId = await getCurrentUserId();
    const { error } = await supabase.from("writings").upsert(
      {
        user_id: userId,
        date,
        activity_content: activityContent || {},
      },
      { onConflict: "user_id,date" }
    );
    if (error) throw error;
  },

  // ─── Signals ──────────────────────────────────────────────

  getDailySignals: async (date: string): Promise<Record<string, any>> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("signals")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date);
    if (error) throw error;

    const signalDict: Record<string, any> = {};
    (data || []).forEach((s: any) => {
      signalDict[s.metric] = s.value;
    });
    return signalDict;
  },

  recordSignal: async (
    date: string,
    metric: string,
    value: number | boolean
  ): Promise<void> => {
    const userId = await getCurrentUserId();
    const { error } = await supabase.from("signals").upsert(
      {
        user_id: userId,
        date,
        metric,
        value,
      },
      { onConflict: "user_id,date,metric" }
    );
    if (error) throw error;
  },

  getSignalRange: async (
    startDate: string,
    endDate: string
  ): Promise<any[]> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("signals")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate);
    if (error) throw error;
    return data || [];
  },

  getAllSignalHistory: async (
    startDate: string,
    endDate: string
  ): Promise<any[]> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("signals")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate);
    if (error) throw error;
    return data || [];
  },

  // ─── User Preferences ────────────────────────────────────

  updateUserPreferences: async (
    userId: string,
    preferences: Record<string, any>
  ): Promise<User> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", userId)
      .single();

    const existingPrefs = profile?.preferences || {};
    const mergedPrefs = { ...existingPrefs, ...preferences };

    const { data, error } = await supabase
      .from("profiles")
      .update({ preferences: mergedPrefs })
      .eq("id", userId)
      .select()
      .single();
    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      picture_url: data.picture_url,
      preferences: data.preferences,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  // ─── Notes ────────────────────────────────────────────────

  getNotes: async (): Promise<Note[]> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  createNote: async (noteData: {
    content: string;
    tags: string[];
  }): Promise<Note> => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        content: noteData.content,
        tags: noteData.tags,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateNote: async (
    noteId: string,
    updates: {
      content?: string;
      is_processed?: boolean;
      tags?: string[];
    }
  ): Promise<Note> => {
    const { data, error } = await supabase
      .from("notes")
      .update(updates)
      .eq("id", noteId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteNote: async (noteId: string): Promise<void> => {
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteId);
    if (error) throw error;
  },
};
