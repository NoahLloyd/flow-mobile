import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = "https://kujhoojkrxkoftcbrgun.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_uHqEH-CEUBbqiq1RoTkciQ_TApuopZC";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: AsyncStorage,
  },
});

export const getCurrentUserId = async (): Promise<string> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user.id;
};
