import { useState, useEffect } from "react";
import { Link } from "react-router";
import { AlertCircle, Check, Flag } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { getReceivedDiary, submitComment, type ReceivedDiary } from "../../lib/comments";
import { getPaperStyle, getEmotionInfo } from "../components/DiaryDecoratorPanel";
// Importing ai.ts registers window.triggerAIFallback for dev console testing
// and kicks off the 24-h AI fallback check whenever this page mounts.
import { checkAndSendAIFallbacks } from "../../lib/ai";

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${y}. ${m}. ${d}`;
}

export function Received() {
  const { user, addNotification } = useApp();
  const [comment, setComment] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [sending, setSending] = useState(false);

  // Real received diary loaded from Supabase
  const [receivedData, setReceivedData] = useState<ReceivedDiary | null>(null);
  const [loadingDiary, setLoadingDiary] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoadingDiary(false);
      return;
    }
    getReceivedDiary(user.id)
      .then(data => setReceivedData(data))
      .catch(() => toast.error("일기를 불러오는 중 오류가 발생했습니다."))
      .finally(() => setLoadingDiary(false));
  }, [user?.id]);

  // Check whether any of the current user's own diaries have been waiting
  // longer than 24 h without a match — if so, generate an AI reply.
  // This also registers window.triggerAIFallback for dev console testing.
  useEffect(() => {
    if (!user) return;
    checkAndSendAIFallbacks().catch(err =>
      console.warn('[AI fallback] check on Received mount failed:', err)
    );
  }, [user?.id]);

  const handleSend = async () => {
    if (!receivedData || !user) return;
    if (comment.length < 30) return;

    setSending(true);
    try {
      await submitComment({
        diaryId: receivedData.diary.id,
        matchId: receivedData.match.id,
        content: comment,
        authorId: user.id,
      });
      setIsSent(true);
      addNotification({ message: '답장이 원작성자에게 전달되었습니다.', type: 'comment', time: '방금 전' });
      toast.success("답장을 보냈어요. 원작성자에게 일기와 함께 전달됩니다.");
    } catch (err: any) {
      toast.error(err?.message ?? '답장 전송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  // ── Tab bar (shared across all states) ────────────────────────────────────
  const tabBar = (
    <div className="flex border-b border-[var(--line)] mb-8 shrink-0">
      <Link to="/app/write" className="px-6 py-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-serif transition-colors">일기 작성</Link>
      <Link to="/app/received" className="px-6 py-3 border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-serif transition-colors">받은 일기</Link>
    </div>
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingDiary) {
    return (
      <div className="max-w-4xl mx-auto p-8 font-serif min-h-screen flex flex-col">
        {tabBar}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[var(--text-muted)] font-serif italic">불러오는 중...</div>
        </div>
      </div>
    );
  }

  // ── No received diary ──────────────────────────────────────────────────────
  if (!receivedData) {
    return (
      <div className="max-w-4xl mx-auto p-8 font-serif min-h-screen flex flex-col">
        {tabBar}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-[20pt] italic text-[var(--text-muted)] mb-4">아직 받은 일기가 없어요.</div>
          <p className="text-[14pt] text-[var(--text-muted)] mb-8">일기를 전송하면 익명의 누군가가 코멘트를 달아 보내드려요.</p>
          <Link to="/app/write" className="text-[var(--accent)] underline underline-offset-4">일기 작성하러 가기</Link>
        </div>
      </div>
    );
  }

  // ── Diary viewer + comment form ────────────────────────────────────────────
  const diaryEmotionInfo = getEmotionInfo(receivedData.diary.emotion);
  return (
    <div className="flex flex-col font-serif text-[var(--text-primary)] max-w-4xl mx-auto px-8 py-8 min-h-screen">

      {/* ── 탭 바 (고정) ── */}
      <div className="shrink-0 w-full">
        <div className="flex border-b border-[var(--line)] mb-4">
          <Link
            to="/app/write"
            className="px-6 py-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-serif transition-colors"
          >
            일기 작성
          </Link>
          <Link
            to="/app/received"
            className="px-6 py-3 border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-serif transition-colors"
          >
            받은 일기
          </Link>
        </div>
      </div>

      {/* ── 콘텐츠 영역 ── */}
      <div className="flex-1 flex flex-col w-full min-h-0 gap-4">

        {/* 상단: 수신한 일기 뷰어 (60%) */}
        <div
          className="flex-[3] overflow-y-auto relative border border-[var(--line)] shadow-sm mb-4 min-h-0"
          style={getPaperStyle((receivedData.diary.paper_design || 'lined') as any)}
        >
          {/* 헤더 */}
          <div className="sticky top-0 bg-[var(--surface)] z-10 px-8 pt-6 pb-4 border-b border-[var(--line)]/50 flex justify-between items-center">
            <div className="font-mono text-[11pt] text-[var(--text-muted)]">익명의 누군가로부터</div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10pt] text-[var(--text-muted)]">
                {formatDate(receivedData.diary.created_date)}
              </span>
              <button
                onClick={() => toast.info("신고가 접수되었습니다. 관리자가 검토합니다.")}
                className="text-[10pt] font-mono text-[var(--text-muted)] hover:text-[var(--destructive)] flex items-center gap-1 transition-colors"
              >
                <Flag size={14} /> 신고
              </button>
            </div>
          </div>

          {/* 일기 내용 */}
          <div className="px-8 py-6 relative min-h-[300px]">
            {/* 마진 라인 (줄지/빈티지) */}
            {(receivedData.diary.paper_design === 'lined' || receivedData.diary.paper_design === 'vintage' || !receivedData.diary.paper_design) && (
              <div className="absolute left-12 top-0 bottom-0 w-px bg-[var(--accent)] opacity-30 pointer-events-none" />
            )}
            {/* 스탬프 */}
            {receivedData.diary.stamp && (
              <div className="absolute top-4 right-6 text-[36px] opacity-60 rotate-12 pointer-events-none select-none z-10">
                {receivedData.diary.stamp}
              </div>
            )}
            {/* 감정 태그 */}
            {diaryEmotionInfo && (
              <div className="relative z-10 flex items-center gap-2 mb-4">
                <span className="text-[18px]">{diaryEmotionInfo.emoji}</span>
                <span className="font-mono text-[9pt] px-3 py-1 rounded-full text-white" style={{ backgroundColor: diaryEmotionInfo.color }}>
                  {diaryEmotionInfo.id}
                </span>
              </div>
            )}
            <div className="relative z-0">
              <p className="font-serif text-[15pt] leading-[2.0] text-[var(--text-primary)] whitespace-pre-wrap">
                {receivedData.diary.content}
              </p>
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div className="h-px border-t border-dashed border-[var(--line)] w-full mb-4 shrink-0" />

        {/* 하단: 코멘트 작성 영역 (40%) */}
        <div className="flex-[2] flex flex-col min-h-0 bg-[var(--surface)] p-6 border border-[var(--line)]">
          {isSent ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
              <Check className="w-12 h-12 text-[var(--secondary)] mb-4 stroke-[1.5]" />
              <h3 className="text-[18pt] italic font-serif mb-2 text-[var(--text-primary)]">답장을 보냈어요.</h3>
              <p className="text-[13pt] text-[var(--text-muted)] font-serif">원작성자에게 일기와 함께 전달됩니다.</p>
              {/* AI fallback notice — shown when the comment was AI-generated
                  (is_ai_generated = true). In the current flow this is always
                  false since comments here are human-written; the banner is
                  rendered for future AI-assisted reply scenarios. */}
              {(receivedData as any)?.comment?.is_ai_generated && (
                <p className="mt-4 text-[11pt] font-mono text-[var(--text-muted)] italic">
                  24시간 내 응답이 없어 AI가 대신 답장을 작성했습니다.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="text-[16pt] font-serif text-[var(--text-primary)]">답장을 남겨보세요</h3>
                <span className={`font-mono text-[10pt] ${comment.length >= 30 ? 'text-[var(--secondary)]' : 'text-[var(--text-muted)]'}`}>
                  {comment.length} / 최소 30자
                </span>
              </div>

              <div className="flex-1 relative mb-2 min-h-[200px]">
                <div
                  className="absolute inset-0 pointer-events-none opacity-10"
                  style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, var(--line) 28px)' }}
                />
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="읽은 소감을 자유롭게 적어주세요. (최소 30자)"
                  className="w-full h-full bg-transparent border border-[var(--line)] p-4 resize-none outline-none font-serif text-[14pt] leading-relaxed placeholder:italic placeholder:text-[var(--text-muted)]"
                />
              </div>

              {comment.length > 0 && comment.length < 30 && (
                <div className="text-[var(--destructive)] text-[10pt] font-mono mb-2 flex items-center gap-1 shrink-0">
                  <AlertCircle size={12} /> 최소 30자 이상 작성해주세요.
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={comment.length < 30 || sending}
                className={`w-full py-3 rounded-[2px] transition-colors font-sans text-[11pt] shrink-0 ${
                  comment.length >= 30 && !sending
                    ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90'
                    : 'bg-[var(--line)] text-[var(--text-muted)] cursor-not-allowed'
                }`}
              >
                {sending ? '전송 중...' : '답장 전송하기'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
