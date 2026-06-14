import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "./supabase";

interface ParentCounts {
  unreadNotifications: number;
  unseenAnnouncements: number;
  refresh: () => Promise<void>;
}

const Ctx = createContext<ParentCounts>({
  unreadNotifications: 0,
  unseenAnnouncements: 0,
  refresh: async () => {},
});

export function ParentCountsProvider({ children }: { children: ReactNode }) {
  const [unreadNotifications, setUnread] = useState(0);
  const [unseenAnnouncements, setUnseen] = useState(0);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUnread(0); setUnseen(0); return; }

    const [notifRes, profRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
      supabase
        .from("profiles")
        .select("announcements_seen_at")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    setUnread(notifRes.count ?? 0);

    let annQuery = supabase
      .from("announcements")
      .select("id", { count: "exact", head: true });
    const seenAt = profRes.data?.announcements_seen_at;
    if (seenAt) annQuery = annQuery.gt("created_at", seenAt);
    const { count: annCount } = await annQuery;
    setUnseen(annCount ?? 0);
  }, []);

  return (
    <Ctx.Provider value={{ unreadNotifications, unseenAnnouncements, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useParentCounts() {
  return useContext(Ctx);
}
