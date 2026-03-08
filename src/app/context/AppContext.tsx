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

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: '1', message: '익명 일기에 답장이 도착했어요!', type: 'comment', time: '1시간 전', read: false },
  { id: '2', message: '그룹 "일상 나누기"에서 일기를 받았어요.', type: 'group', time: '3시간 전', read: false },
  { id: '3', message: 'AI가 답장을 작성했습니다.', type: 'ai', time: '어제', read: true },
];

// Ensure myGroups is initialized in localStorage before any component reads it
if (!localStorage.getItem('myGroups')) {
  localStorage.setItem('myGroups', JSON.stringify([
    { id: 1, name: "독서 모임", members: 6, max: 8, isOwner: true, status: 'completed', comments: 2, isPrivate: true, desc: "함께 책을 읽고 감상을 나눠요" },
    { id: 2, name: "기상 스터디", members: 4, max: 6, isOwner: false, status: 'writing', comments: 0, isPrivate: false, desc: "매일 아침 6시 기상 인증" },
    { id: 3, name: "일상 나누기", members: 3, max: 5, isOwner: false, status: 'waiting', comments: 1, isPrivate: true, desc: "소소한 일상을 기록하는 곳" },
  ]));
}

function getInitialArchive(): ArchiveEntry[] {
  const d = (n: number) => {
    const date = new Date();
    date.setDate(date.getDate() - n);
    return date.toISOString().split('T')[0];
  };
  return [
    {
      id: 'init-0', date: d(1), title: '오늘 날씨가 참 좋았다',
      content: '오늘 날씨가 참 좋았다. 오랜만에 산책을 나갔는데 바람도 적당히 불고 기분이 좋았다. 카페에 들러 책도 한 권 읽었다.',
      type: 'anonymous', emotion: '기쁨', status: 'completed',
      comment: '날씨 좋은 날 산책하는 건 언제나 기분 좋죠. 덕분에 저도 오늘 잠깐 밖에 나가고 싶어졌어요.',
    },
    {
      id: 'init-1', date: d(2), title: '친구들과 카페에서',
      content: '친구들과 함께 카페에서 수다를 떨었다. 오랜만에 모였는데 시간 가는 줄 몰랐다. 다음에도 자주 만나자고 했다.',
      type: 'group', emotion: '기쁨', status: 'completed',
      comment: '좋은 사람들과 함께하는 시간은 언제나 소중하죠.', groupName: '일상 나누기',
    },
    {
      id: 'init-2', date: d(3), title: '혼자만의 시간',
      content: '혼자만의 시간이 필요해서 조용히 책을 읽었다. 카페의 소음이 오히려 집중을 도와줬다.',
      type: 'ai', emotion: '평온', status: 'completed',
      comment: '독서는 마음의 양식이죠. 혼자만의 조용한 시간도 정말 소중해요.',
    },
  ];
}

export function AppProvider({ children }: { children: ReactNode }) {
  // ── Auth ──────────────────────────────────────────────────
  const { user, profile, loading: authLoading, signOut: authSignOut } = useAuth();

  // ── Theme ─────────────────────────────────────────────────
  const [theme, setThemeState] = useState<ThemeType>(() => {
    return (localStorage.getItem('theme') as ThemeType) || 'light';
  });

  // ── Diary status ──────────────────────────────────────────
  const [diaryStatus, setDiaryStatus] = useState<DiaryStatus>(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('diaryDate');
    const savedStatus = localStorage.getItem('diaryStatus') as DiaryStatus;
    if (savedDate === today && savedStatus) return savedStatus;
    return 'unwritten';
  });

  const [todayDiary, setTodayDiaryState] = useState<AppContextType['todayDiary']>(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('diaryDate');
    if (savedDate === today) {
      const raw = localStorage.getItem('todayDiary');
      if (raw) return JSON.parse(raw);
    }
    return null;
  });

  // ── Notifications ─────────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const raw = localStorage.getItem('notifications');
    if (raw) return JSON.parse(raw);
    return INITIAL_NOTIFICATIONS;
  });

  // ── Group / AI written today ───────────────────────────────
  const [groupDiaryWrittenToday, setGroupDiaryWrittenToday] = useState(() => {
    const today = new Date().toDateString();
    return localStorage.getItem('groupDiaryDate') === today;
  });

  const [aiDiaryWrittenToday, setAiDiaryWrittenToday] = useState(() => {
    const today = new Date().toDateString();
    return localStorage.getItem('aiDiaryDate') === today;
  });

  // ── Archive ───────────────────────────────────────────────
  const [archiveEntries, setArchiveEntries] = useState<ArchiveEntry[]>(() => {
    const raw = localStorage.getItem('archiveEntries');
    if (raw) return JSON.parse(raw);
    const initial = getInitialArchive();
    localStorage.setItem('archiveEntries', JSON.stringify(initial));
    return initial;
  });

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
            localStorage.setItem('diaryStatus', 'arrived');
            localStorage.setItem('diaryDate', new Date().toDateString());
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
            localStorage.setItem('diaryStatus', 'arrived');
            localStorage.setItem('diaryDate', new Date().toDateString());
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
    localStorage.setItem('diaryStatus', s);
    localStorage.setItem('diaryDate', new Date().toDateString());
  };

  const setTodayDiary = (d: AppContextType['todayDiary']) => {
    setTodayDiaryState(d);
    if (d) {
      localStorage.setItem('todayDiary', JSON.stringify(d));
      localStorage.setItem('diaryDate', new Date().toDateString());
    } else {
      localStorage.removeItem('todayDiary');
    }
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
