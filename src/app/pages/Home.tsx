import { Link } from "react-router";
import { Bell, ArrowRight, User, Users, Sparkles, CheckCircle2, Clock, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { useApp, useUnreadCount } from "../context/AppContext";
import { supabase } from "../../lib/supabase";

export function Home() {
  const { diaryStatus, groupDiaryWrittenToday, aiDiaryWrittenToday, notifications, archiveEntries, user } = useApp();
  const unreadCount = useUnreadCount();
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Supabase-sourced diary status (overrides localStorage-backed AppContext value)
  const [localDiaryStatus, setLocalDiaryStatus] = useState<typeof diaryStatus | null>(null);
  const effectiveDiaryStatus = localDiaryStatus ?? diaryStatus;

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    // Use KST date so the status resets at midnight KST, not UTC
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

    async function fetchStatus() {
      const { data } = await supabase
        .from('diaries')
        .select('id, status, comments!left(id)')
        .eq('author_id', userId)
        .eq('created_date', today)
        .eq('exchange_mode', 'anonymous')
        .limit(1)
        .maybeSingle();

      if (!data) {
        setLocalDiaryStatus('unwritten');
        return;
      }

      const comments = (data.comments as any[]) ?? [];
      if (data.status === 'waiting' || data.status === 'matched') {
        setLocalDiaryStatus('sending');
      } else if (data.status === 'completed') {
        setLocalDiaryStatus(comments.length > 0 ? 'completed' : 'arrived');
      } else {
        setLocalDiaryStatus('sending');
      }
    }

    fetchStatus();

    const channel = supabase
      .channel(`home_diary_status_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'diaries', filter: `author_id=eq.${userId}` },
        () => { fetchStatus(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // ── Pending group comments (diaries where user is the receiver) ───────────
  const [pendingCommentCount, setPendingCommentCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    async function fetchPendingCount() {
      const { count } = await supabase
        .from('diary_matches')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user!.id)
        .eq('status', 'pending');
      setPendingCommentCount(count ?? 0);
    }
    fetchPendingCount();
  }, [user?.id]);

  // ── Last AI diary date ────────────────────────────────────────────────────
  const [lastAiDiaryDate, setLastAiDiaryDate] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    async function fetchLastAiDiary() {
      const { data } = await supabase
        .from('diaries')
        .select('created_date')
        .eq('author_id', user!.id)
        .eq('exchange_mode', 'ai')
        .order('created_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      setLastAiDiaryDate(data?.created_date ?? null);
    }
    fetchLastAiDiary();
  }, [user?.id]);

  const groupCount = (() => {
    try { return JSON.parse(localStorage.getItem('myGroups') || '[]').length; } catch { return 0; }
  })();

  const recentEntries = archiveEntries.slice(0, 3);
  const typeLabel: Record<string, string> = { anonymous: '익명', group: '그룹', ai: 'AI' };
  const typeBorderColor: Record<string, string> = {
    anonymous: 'border-[var(--accent)] text-[var(--accent)]',
    group: 'border-[var(--secondary)] text-[var(--secondary)]',
    ai: 'border-[#A89CC8] text-[#A89CC8]',
  };

  const today = new Date();
  const formattedDate = today.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  const statusConfig = {
    unwritten: {
      color: 'var(--text-muted)',
      icon: Clock,
      text: '오늘의 일기를 아직 작성하지 않았어요.',
      action: '지금 작성하기',
      link: '/app/write',
    },
    sending: {
      color: 'var(--accent)',
      icon: Send,
      text: '일기가 누군가에게 전달 중이에요.',
      action: '보낸 일기 확인하기',
      link: '/app/archive',
    },
    arrived: {
      color: 'var(--secondary)',
      icon: Bell,
      text: '답장이 도착했어요!',
      action: '답장 확인하기',
      link: '/app/archive',
    },
    completed: {
      color: 'var(--secondary)',
      icon: CheckCircle2,
      text: '오늘의 일기 교환을 완료했어요.',
      action: '오늘의 기록 보기',
      link: '/app/archive',
    },
  };

  const current = statusConfig[effectiveDiaryStatus];
  const StatusIcon = current.icon;

  return (
    <div className="p-8 max-w-7xl mx-auto font-serif text-[var(--text-primary)]">
      {/* 상단 헤더 */}
      <header className="h-[72px] flex items-center justify-between mb-8">
        <h1 className="text-[20pt] font-serif">{formattedDate}</h1>
        <div className="relative">
          <button
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            className="relative cursor-pointer hover:bg-[var(--line)]/40 p-2 rounded-full transition-colors"
          >
            <Bell className="w-6 h-6 stroke-[1.5]" />
            {unreadCount > 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-[var(--accent)] rounded-full border-2 border-[var(--bg)]" />
            )}
          </button>

          {/* 알림 드롭다운 */}
          {showNotifPanel && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
              <div className="absolute right-0 top-full mt-2 w-[320px] bg-[var(--surface)] border border-[var(--line)] shadow-lg z-50 rounded-[4px] overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--line)] flex items-center justify-between">
                  <span className="font-mono text-[10pt] text-[var(--text-muted)]">알림</span>
                  {unreadCount > 0 && (
                    <span className="text-[9pt] text-[var(--accent)] font-mono">{unreadCount}개 새 알림</span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-[var(--text-muted)] text-[12pt] font-serif italic">알림이 없어요</div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-dashed border-[var(--line)] last:border-0 ${!n.read ? 'bg-[var(--accent)]/5' : ''}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${!n.read ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`} />
                      <div>
                        <p className="font-serif text-[11pt]">{n.message}</p>
                        <p className="font-mono text-[9pt] text-[var(--text-muted)] mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))
                )}
                <Link to="/app/mypage" onClick={() => setShowNotifPanel(false)}>
                  <div className="px-4 py-3 text-center text-[9pt] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors border-t border-[var(--line)]">
                    전체 보기 →
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>
      </header>

      {/* 오늘의 상태 카드 */}
      <div className="w-full bg-[var(--surface)] border border-[var(--line)] mb-10 flex shadow-sm">
        <div className="w-1 shrink-0" style={{ backgroundColor: current.color }} />
        <div className="flex-1 p-6 flex items-center justify-between">
          <div>
            <p className="text-[15pt] font-serif mb-2">{current.text}</p>
            <Link to={current.link} className="text-[11pt] font-mono text-[var(--accent)] hover:underline underline-offset-4 flex items-center gap-2">
              {current.action} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-full bg-[var(--line)]/30 flex items-center justify-center">
            <StatusIcon className="w-6 h-6 stroke-[1.5] text-[var(--text-muted)]" />
          </div>
        </div>
      </div>

      {/* 3개 모드 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {/* 익명 교환 */}
        <div className="bg-[var(--surface)] border border-[var(--line)] p-6 shadow-sm hover:border-[var(--accent)] transition-colors group">
          <div className="flex justify-between items-start mb-5">
            <span className="font-mono text-[10pt] text-[var(--text-muted)]">익명 교환</span>
            <User className="w-5 h-5 stroke-[1.5] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
          </div>
          <div className="mb-6">
            <div className="text-[11pt] text-[var(--text-muted)] font-mono mb-1">오늘 상태</div>
            <div className="text-[16pt] font-serif">
              {effectiveDiaryStatus === 'unwritten' && '미작성'}
              {effectiveDiaryStatus === 'sending' && '전달 중'}
              {effectiveDiaryStatus === 'arrived' && '답장 도착 ✓'}
              {effectiveDiaryStatus === 'completed' && '교환 완료 ✓'}
            </div>
          </div>
          <Link to={effectiveDiaryStatus === 'unwritten' ? '/app/write' : '/app/archive'}>
            <button className="w-full py-2.5 border border-[var(--line)] text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-colors rounded-[2px] font-sans text-[10pt]">
              {effectiveDiaryStatus === 'unwritten' ? '일기 작성하기' : '확인하기'}
            </button>
          </Link>
        </div>

        {/* 그룹 일기 */}
        <div className="bg-[var(--surface)] border border-[var(--line)] p-6 shadow-sm hover:border-[var(--secondary)] transition-colors group">
          <div className="flex justify-between items-start mb-5">
            <span className="font-mono text-[10pt] text-[var(--text-muted)]">그룹 일기</span>
            <Users className="w-5 h-5 stroke-[1.5] text-[var(--text-muted)] group-hover:text-[var(--secondary)] transition-colors" />
          </div>
          <div className="mb-6">
            <div className="text-[16pt] font-serif mb-1">{groupCount}개 그룹 참여 중</div>
            <div className={`text-[10pt] font-mono ${groupDiaryWrittenToday ? 'text-[var(--secondary)]' : 'text-[var(--accent)]'}`}>
              {groupDiaryWrittenToday
                ? '오늘 일기 완료 ✓'
                : pendingCommentCount !== null && pendingCommentCount > 0
                  ? `대기 중인 코멘트 ${pendingCommentCount}건`
                  : '일기를 작성해보세요'}
            </div>
          </div>
          <Link to="/app/group">
            <button className="w-full py-2.5 border border-[var(--line)] text-[var(--text-primary)] hover:bg-[var(--secondary)] hover:text-white hover:border-[var(--secondary)] transition-colors rounded-[2px] font-sans text-[10pt]">
              그룹 보기
            </button>
          </Link>
        </div>

        {/* AI 일기 (전체 너비) */}
        <div className="md:col-span-2 bg-[var(--surface)] border border-[var(--line)] p-6 shadow-sm hover:border-[var(--accent)] transition-colors group flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10pt] text-[var(--text-muted)]">AI 교환</span>
              <Sparkles className="w-4 h-4 stroke-[1.5] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
            </div>
            <div className="text-[15pt] font-serif">
              {aiDiaryWrittenToday
                ? '오늘 일기 보냄 · 내일 오전 8시 답장 예정'
                : lastAiDiaryDate
                  ? `마지막 일기: ${new Date(lastAiDiaryDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' })}`
                  : 'AI와 일기를 교환해보세요'}
            </div>
          </div>
          <Link to="/app/ai" className="w-full md:w-auto">
            <button className="w-full md:w-auto px-7 py-2.5 border border-[var(--line)] text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-colors rounded-[2px] font-sans text-[10pt] whitespace-nowrap">
              {aiDiaryWrittenToday ? 'AI 답장 확인' : '오늘 일기 보내기'}
            </button>
          </Link>
        </div>
      </div>

      {/* 최근 기록 */}
      <div className="border-t border-[var(--line)] pt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[15pt] font-serif">최근 교환 기록</h2>
          <Link to="/app/archive" className="text-[10pt] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            전체 보기
          </Link>
        </div>

        <div className="divide-y divide-dashed divide-[var(--line)]">
          {recentEntries.length === 0 ? (
            <div className="py-8 text-center text-[var(--text-muted)] font-serif text-[13pt] italic">
              아직 교환 기록이 없어요.
            </div>
          ) : (
            recentEntries.map((item) => (
              <Link
                key={item.id}
                to="/app/archive"
                className="py-4 flex items-center gap-6 hover:bg-[var(--surface)]/60 transition-colors px-4 -mx-4 rounded-sm"
              >
                <div className="w-24 shrink-0 font-mono text-[9pt] text-[var(--text-muted)]">{item.date}</div>
                <div className="flex-1 font-serif text-[13pt] text-[var(--text-primary)] truncate opacity-80">
                  {item.title || item.content.slice(0, 30)}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 text-[8pt] font-mono rounded-full border ${typeBorderColor[item.type] || ''}`}>
                    {typeLabel[item.type]}
                  </span>
                  {item.status === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-[var(--secondary)] stroke-[1.5]" />
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
