import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

export type ThemeType = 'light' | 'dark' | 'pastel';
export type DiaryStatus = 'unwritten' | 'sending' | 'arrived' | 'completed';

export interface Notification {
  id: string;
  message: string;
  type: 'comment' | 'group' | 'ai';
  time: string;
  read: boolean;
}

export interface ArchiveEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title?: string;
  content: string;
  type: 'anonymous' | 'group' | 'ai';
  emotion?: string;
  paper_design?: string;
  stamp?: string;
  status: 'waiting' | 'completed';
  comment?: string;
  isAiComment?: boolean;
  groupName?: string;
}

interface AppContextType {
  // Auth
  user: User | null;
  authLoading: boolean;

  // Theme
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;

  // Diary status (anonymous mode)
  diaryStatus: DiaryStatus;
  setDiaryStatus: (s: DiaryStatus) => void;

  // Today's written diary (for anonymous)
  todayDiary: { title: string; content: string; stamp?: string; emotion?: string } | null;
  setTodayDiary: (d: AppContextType['todayDiary']) => void;

  // Notifications
  notifications: Notification[];
  markAllRead: () => void;
  addNotification: (n: Omit<Notification, 'id' | 'read'>) => void;

  // Group diary written today
  groupDiaryWrittenToday: boolean;
  setGroupDiaryWrittenToday: (v: boolean) => void;

  // AI diary written today
  aiDiaryWrittenToday: boolean;
  setAiDiaryWrittenToday: (v: boolean) => void;

  // Archive entries
  archiveEntries: ArchiveEntry[];
  addArchiveEntry: (e: Omit<ArchiveEntry, 'id'>) => string;
  updateArchiveEntry: (id: string, update: Partial<ArchiveEntry>) => void;

  // User nickname
  nickname: string;
  setNickname: (n: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);


export function AppProvider({ children }: { children: ReactNode }) {
  // ── Auth ──────────────────────────────────────────────────
  const { user, profile, loading: authLoading, signOut: authSignOut } = useAuth();

  // ── Theme ─────────────────────────────────────────────────
  const [theme, setThemeState] = useState<ThemeType>(() => {
    return (localStorage.getItem('theme') as ThemeType) || 'light';
  });

  // ── Diary status — always derived from Supabase, never from localStorage ──
  const [diaryStatus, setDiaryStatus] = useState<DiaryStatus>('unwritten');

  const [todayDiary, setTodayDiaryState] = useState<AppContextType['todayDiary']>(null);

  // ── Notifications — populated by Supabase realtime subscription ──────────
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // ── Group / AI written today ───────────────────────────────
  const [groupDiaryWrittenToday, setGroupDiaryWrittenToday] = useState(() => {
    const today = new Date().toDateString();
    return localStorage.getItem('groupDiaryDate') === today;
  });

  const [aiDiaryWrittenToday, setAiDiaryWrittenToday] = useState(() => {
    const today = new Date().toDateString();
    return localStorage.getItem('aiDiaryDate') === today;
  });

  // ── Archive — populated by Archive page from Supabase ────────────────────
  const [archiveEntries, setArchiveEntries] = useState<ArchiveEntry[]>([]);

  // ── Clear stale diary-status localStorage keys on every mount ────────────
  useEffect(() => {
    localStorage.removeItem('diaryStatus');
    localStorage.removeItem('diaryDate');
    localStorage.removeItem('todayDiary');
  }, []);

  // ── Nickname: localStorage until profile loads ────────────
  const [nickname, setNicknameState] = useState(() => {
    return localStorage.getItem('nickname') || '익명의 독자';
  });

  // Sync nickname from Supabase profile whenever it loads
  useEffect(() => {
    if (profile?.nickname) {
      setNicknameState(profile.nickname);
      localStorage.setItem('nickname', profile.nickname);
    }
  }, [profile?.nickname]);

  // ── Real-time: watch diary_matches for status changes (sender side) ───────
  // When the receiver comments on our diary, update diaryStatus → 'arrived'
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`diary_status_${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'diary_matches',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as { status: string };
          if (updated.status === 'commented' || updated.status === 'returned') {
            setDiaryStatus('arrived');
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // ── Real-time: watch notifications table for new entries ──────────────────
  // The DB trigger (handle_match_commented) inserts notifications for the
  // sender when a comment arrives. This subscription surfaces them in the UI.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications_rt_${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Map DB row (is_read) → frontend Notification type (read)
          const row = payload.new as {
            id: string;
            type: string;
            message: string;
            is_read: boolean;
            created_at: string;
          };
          const n: Notification = {
            id:      row.id,
            message: row.message,
            type:    row.type as Notification['type'],
            time:    '방금 전',
            read:    false,
          };
          setNotifications(prev => {
            const next = [n, ...prev];
            localStorage.setItem('notifications', JSON.stringify(next));
            return next;
          });
          // A comment notification means our diary got a reply
          if (row.type === 'comment') {
            setDiaryStatus('arrived');
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // ── Apply theme to <html> ─────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-pastel');
    if (theme === 'dark') root.classList.add('dark');
    if (theme === 'pastel') root.classList.add('theme-pastel');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ── Setters ───────────────────────────────────────────────
  const setTheme = (t: ThemeType) => setThemeState(t);

  const setDiaryStatusAndSave = (s: DiaryStatus) => {
    setDiaryStatus(s);
  };

  const setTodayDiary = (d: AppContextType['todayDiary']) => {
    setTodayDiaryState(d);
  };

  const markAllRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const addNotification = (n: Omit<Notification, 'id' | 'read'>) => {
    setNotifications(prev => {
      const updated = [{ ...n, id: Date.now().toString(), read: false }, ...prev];
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const setGroupDiaryWrittenTodayAndSave = (v: boolean) => {
    setGroupDiaryWrittenToday(v);
    if (v) localStorage.setItem('groupDiaryDate', new Date().toDateString());
  };

  const setAiDiaryWrittenTodayAndSave = (v: boolean) => {
    setAiDiaryWrittenToday(v);
    if (v) localStorage.setItem('aiDiaryDate', new Date().toDateString());
  };

  const addArchiveEntry = (e: Omit<ArchiveEntry, 'id'>): string => {
    const id = `entry-${Date.now()}`;
    setArchiveEntries(prev => {
      const updated = [{ ...e, id }, ...prev];
      localStorage.setItem('archiveEntries', JSON.stringify(updated));
      return updated;
    });
    return id;
  };

  const updateArchiveEntry = (id: string, update: Partial<ArchiveEntry>) => {
    setArchiveEntries(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...update } : e);
      localStorage.setItem('archiveEntries', JSON.stringify(updated));
      return updated;
    });
  };

  const setNickname = (n: string) => {
    setNicknameState(n);
    localStorage.setItem('nickname', n);
    // Persist to Supabase profile in the background when signed in
    if (user) {
      supabase.from('profiles').update({ nickname: n }).eq('id', user.id);
    }
  };

  return (
    <AppContext.Provider value={{
      user,
      authLoading,
      theme,
      setTheme,
      diaryStatus,
      setDiaryStatus: setDiaryStatusAndSave,
      todayDiary,
      setTodayDiary,
      notifications,
      markAllRead,
      addNotification,
      groupDiaryWrittenToday,
      setGroupDiaryWrittenToday: setGroupDiaryWrittenTodayAndSave,
      aiDiaryWrittenToday,
      setAiDiaryWrittenToday: setAiDiaryWrittenTodayAndSave,
      archiveEntries,
      addArchiveEntry,
      updateArchiveEntry,
      nickname,
      setNickname,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useUnreadCount() {
  const { notifications } = useApp();
  return notifications.filter(n => !n.read).length;
}
