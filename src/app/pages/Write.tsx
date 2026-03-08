import { useState } from "react";
import { Link } from "react-router";
import { FileText, Stamp, Heart, X, AlertTriangle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  DiaryDecoratorPanel,
  defaultDecoration,
  getPaperStyle,
  getEmotionInfo,
  type DiaryDecoration,
} from "../components/DiaryDecoratorPanel";
import { useApp } from "../context/AppContext";
import { checkInappropriateContent, hasRepetitiveChars } from "../../lib/moderation";
import { submitAnonymousDiary, checkDailyLimit } from "../../lib/diary";

export function Write() {
  const {
    user,
    diaryStatus,
    setDiaryStatus,
    setTodayDiary,
    addNotification,
    addArchiveEntry,
  } = useApp();

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [showSendSheet, setShowSendSheet] = useState(false);
  const [isSent, setIsSent] = useState(diaryStatus !== 'unwritten');
  const [sending, setSending] = useState(false);

  const [decoration, setDecoration] = useState<DiaryDecoration>(() => {
    const savedPaper = localStorage.getItem('defaultPaper');
    const savedStamp = localStorage.getItem('defaultStamp');
    return {
      ...defaultDecoration,
      paper: (savedPaper as any) || defaultDecoration.paper,
      stamp: savedStamp || defaultDecoration.stamp,
    };
  });
  const [activePanel, setActivePanel] = useState<'paper' | 'stamp' | 'emotion' | null>(null);

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const togglePanel = (panel: 'paper' | 'stamp' | 'emotion') => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const handleSend = async () => {
    // 1. Client-side content checks (fast, no network)
    if (checkInappropriateContent(content) || checkInappropriateContent(title)) {
      toast.custom((t) => (
        <div className="bg-[#F5E6D8] border-l-4 border-red-500 p-4 shadow-md flex items-start gap-3 w-[360px]">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="flex-1 text-[10pt] font-serif text-[#2C2416]">
            부적절한 표현이 감지되어 전송이 제한되었습니다. 내용을 수정해주세요.
          </p>
          <button onClick={() => toast.dismiss(t)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      ), { duration: 5000 });
      return;
    }

    if (hasRepetitiveChars(content)) {
      toast.custom((t) => (
        <div className="bg-[#F5E6D8] border-l-4 border-amber-500 p-4 shadow-md flex items-start gap-3 w-[360px]">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="flex-1 text-[10pt] font-serif text-[#2C2416]">
            의미 없는 반복 문자는 전송할 수 없습니다. 내용을 조금 더 작성해주세요.
          </p>
          <button onClick={() => toast.dismiss(t)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      ), { duration: 5000 });
      return;
    }

    // 2. Server-side daily limit check
    if (user) {
      try {
        const alreadySubmitted = await checkDailyLimit(user.id, 'anonymous');
        if (alreadySubmitted) {
          setIsSent(true);
          return;
        }
      } catch {
        // If limit check fails, let user proceed (non-blocking)
      }
    }

    setShowSendSheet(true);
  };

  const confirmSend = async () => {
    if (!user) return;
    setShowSendSheet(false);
    setSending(true);

    try {
      await submitAnonymousDiary({
        title:       title || undefined,
        content,
        emotion:     decoration.emotion || undefined,
        stamp:       decoration.stamp   || undefined,
        paperDesign: decoration.paper,
        userId:      user.id,
      });

      setIsSent(true);
      setDiaryStatus('sending');
      setTodayDiary({
        title,
        content,
        stamp:   decoration.stamp   || undefined,
        emotion: decoration.emotion || undefined,
      });
      addNotification({
        message: '일기가 익명의 누군가에게 전달되었습니다.',
        type: 'comment',
        time: '방금 전',
      });
      toast.success("일기가 전송되었습니다. 답장을 기다려보세요!");

      // Keep localStorage archive in sync (Archive page still uses localStorage)
      addArchiveEntry({
        date:    new Date().toISOString().split('T')[0],
        title:   title   || undefined,
        content,
        type:    'anonymous',
        emotion: decoration.emotion || undefined,
        stamp:   decoration.stamp   || undefined,
        status:  'waiting',
      });
    } catch (err: any) {
      toast.custom((t) => (
        <div className="bg-[#F5E6D8] border-l-4 border-red-500 p-4 shadow-md flex items-start gap-3 w-[360px]">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="flex-1 text-[10pt] font-serif text-[#2C2416]">
            {err?.message?.includes('감지') ? err.message : '전송 중 오류가 발생했습니다. 다시 시도해주세요.'}
          </p>
          <button onClick={() => toast.dismiss(t)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      ), { duration: 5000 });
      setShowSendSheet(true); // reopen sheet so user can retry
    } finally {
      setSending(false);
    }
  };

  const emotionInfo = getEmotionInfo(decoration.emotion);
  const paperStyle = getPaperStyle(decoration.paper);

  if (isSent) {
    const savedDiary = (() => {
      try { return JSON.parse(localStorage.getItem('todayDiary') || 'null'); } catch { return null; }
    })();
    const displayTitle = savedDiary?.title || title;
    const displayContent = savedDiary?.content || content || '일기 내용';
    const displayStamp = savedDiary?.stamp || decoration.stamp;
    const displayEmotionInfo = getEmotionInfo(savedDiary?.emotion || decoration.emotion || null);

    return (
      <div className="max-w-4xl mx-auto p-8 font-serif min-h-screen flex flex-col">
        <div className="flex border-b border-[var(--line)] mb-8 shrink-0">
          <button className="px-6 py-3 border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-serif">일기 작성</button>
          <Link to="/app/received" className="px-6 py-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-serif">받은 일기</Link>
        </div>

        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 px-5 py-3 mb-8 font-mono text-[10pt] text-center text-[var(--accent)]">
          오늘의 익명 일기는 이미 작성했습니다. 내일 다시 작성할 수 있어요.
        </div>

        <div className="flex-1 relative shadow-sm border border-[var(--line)] p-12 overflow-hidden" style={paperStyle}>
          <div className="absolute left-12 top-0 bottom-0 w-px bg-[var(--accent)] opacity-20" />
          {displayEmotionInfo && (
            <div className="relative z-10 flex items-center gap-2 mb-4">
              <span className="text-[18px]">{displayEmotionInfo.emoji}</span>
              <span className="font-mono text-[9pt] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: displayEmotionInfo.color }}>
                {displayEmotionInfo.id}
              </span>
            </div>
          )}
          {displayStamp && (
            <div className="absolute top-8 right-8 text-[32px] opacity-70 rotate-12">{displayStamp}</div>
          )}
          <div className="relative z-10">
            <div className="font-mono text-[10pt] text-[var(--text-muted)] mb-6">{today}</div>
            {displayTitle && <h2 className="font-serif text-[22pt] mb-6">{displayTitle}</h2>}
            <div className="font-serif text-[15pt] leading-[2.0] whitespace-pre-wrap">{displayContent}</div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Link to="/app/archive" className="text-[10pt] font-mono text-[var(--accent)] hover:underline underline-offset-4">
            답장 확인하러 가기 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 pb-20 font-serif min-h-screen flex flex-col relative">
      {/* 탭 바 */}
      <div className="flex border-b border-[var(--line)] mb-8 shrink-0">
        <button className="px-6 py-3 border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-serif">일기 작성</button>
        <Link to="/app/received" className="px-6 py-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-serif transition-colors">받은 일기</Link>
      </div>

      {/* 에디터 */}
      <div className="flex-1 relative shadow-sm border border-[var(--line)] min-h-[600px]" style={paperStyle}>
        {(decoration.paper === 'lined' || decoration.paper === 'vintage') && (
          <div className="absolute left-12 top-0 bottom-0 w-px bg-[var(--accent)] opacity-30" />
        )}
        {decoration.stamp && (
          <div className="absolute top-8 right-8 text-[40px] opacity-60 rotate-12 pointer-events-none select-none z-10">
            {decoration.stamp}
          </div>
        )}

        <div className="relative z-10 px-12 py-10">
          {emotionInfo && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[18px]">{emotionInfo.emoji}</span>
              <span className="font-mono text-[9pt] px-3 py-1 rounded-full text-white" style={{ backgroundColor: emotionInfo.color }}>
                {emotionInfo.id}
              </span>
            </div>
          )}
          <div className="font-mono text-[10pt] text-[var(--text-muted)] mb-2">{today}</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목 (선택)"
            className="w-full bg-transparent border-none outline-none font-serif text-[22pt] placeholder:italic placeholder:text-[var(--text-muted)] mb-6 pb-4 border-b border-[var(--line)]/30 text-[var(--text-primary)]"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="오늘 하루를 기록해보세요..."
            className="w-full bg-transparent border-none outline-none resize-none font-serif text-[15pt] leading-[2.0] placeholder:italic placeholder:text-[var(--text-muted)] min-h-[400px] text-[var(--text-primary)]"
          />
        </div>
      </div>

      {/* 하단 툴바 */}
      <div className="fixed bottom-0 left-0 lg:left-[64px] right-0 bg-[var(--bg)] border-t border-[var(--line)] z-40">
        <div className="relative">
          <DiaryDecoratorPanel
            activePanel={activePanel}
            decoration={decoration}
            onChange={setDecoration}
            onClose={() => setActivePanel(null)}
          />
          <div className="h-14 flex items-center justify-between px-8">
            <div className="flex items-center gap-1">
              <button
                onClick={() => togglePanel('paper')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${activePanel === 'paper' ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--line)]/40 text-[var(--text-primary)]'}`}
              >
                <FileText className="w-4 h-4" />
                <span className="text-[10pt]">종이</span>
                {decoration.paper !== 'lined' && activePanel !== 'paper' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                )}
              </button>
              <button
                onClick={() => togglePanel('stamp')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${activePanel === 'stamp' ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--line)]/40 text-[var(--text-primary)]'}`}
              >
                <Stamp className="w-4 h-4" />
                <span className="text-[10pt]">스탬프</span>
                {decoration.stamp && activePanel !== 'stamp' && (
                  <span className="text-[12px]">{decoration.stamp}</span>
                )}
              </button>
              <button
                onClick={() => togglePanel('emotion')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${activePanel === 'emotion' ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--line)]/40 text-[var(--text-primary)]'}`}
              >
                <Heart className="w-4 h-4" />
                <span className="text-[10pt]">감정</span>
                {decoration.emotion && activePanel !== 'emotion' && (
                  <span className="text-[12px]">{getEmotionInfo(decoration.emotion)?.emoji}</span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="font-mono text-[10pt] text-[var(--text-muted)]">{content.length}자</span>
              <button
                onClick={handleSend}
                disabled={content.length === 0 || sending}
                className="bg-[var(--accent)] text-white px-6 py-2 rounded-[2px] text-[10pt] hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                전송하기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 전송 바텀 시트 */}
      {showSendSheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowSendSheet(false)} />
          <div className="fixed bottom-0 left-0 lg:left-[64px] right-0 bg-[var(--surface)] rounded-t-[12px] z-50 p-8 shadow-lg animate-in slide-in-from-bottom duration-300">
            <div className="w-8 h-1 bg-[var(--text-muted)]/30 rounded-full mx-auto mb-6" />
            <h3 className="text-[20pt] font-serif mb-2 text-center text-[var(--text-primary)]">익명 교환으로 전송합니다</h3>
            <p className="text-[11pt] text-[var(--text-muted)] font-serif text-center mb-2">
              랜덤으로 매칭된 익명의 사용자가 코멘트를 달아 돌려보냅니다.
            </p>
            <p className="text-[9pt] text-[var(--text-muted)] font-mono text-center mb-8">
              24시간 내 미응답 시 AI가 자동으로 답장합니다.
            </p>

            <div className="max-w-md mx-auto mb-8 p-5 border border-[var(--line)] transform rotate-1 relative overflow-hidden" style={paperStyle}>
              {decoration.stamp && (
                <div className="absolute top-2 right-2 text-[20px] opacity-60 rotate-12">{decoration.stamp}</div>
              )}
              {emotionInfo && (
                <span className="inline-flex items-center gap-1 text-[8pt] font-mono px-2 py-0.5 rounded-full text-white mb-2" style={{ backgroundColor: emotionInfo.color }}>
                  {emotionInfo.emoji} {emotionInfo.id}
                </span>
              )}
              {title && <p className="font-serif text-[12pt] mb-1 text-[var(--text-primary)]">{title}</p>}
              <p className="font-serif text-[10pt] text-[var(--text-muted)] line-clamp-2">{content}</p>
            </div>

            <div className="flex flex-col gap-3 max-w-md mx-auto">
              <button
                onClick={confirmSend}
                disabled={sending}
                className="w-full bg-[var(--accent)] text-white py-3.5 rounded-[2px] hover:bg-[var(--accent)]/90 transition-colors font-serif disabled:opacity-60"
              >
                {sending ? '전송 중...' : '전송하기'}
              </button>
              <button
                onClick={() => setShowSendSheet(false)}
                disabled={sending}
                className="w-full text-[var(--text-muted)] py-2 text-[10pt] hover:text-[var(--text-primary)] transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
