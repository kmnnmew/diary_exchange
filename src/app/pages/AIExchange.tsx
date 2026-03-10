import { useState, useEffect, useRef } from "react";
import { Sparkles, ChevronDown, ChevronUp, Lock, RefreshCcw, FileText, Stamp, Heart, Download } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { scheduleAIComment } from "../../lib/ai";
import {
  DiaryDecoratorPanel,
  defaultDecoration,
  getPaperStyle,
  getEmotionInfo,
  type DiaryDecoration,
} from "../components/DiaryDecoratorPanel";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AiDiaryEntry {
  id: string
  content: string
  status: string
  created_at: string
  emotion?: string | null
  stamp?: string | null
}

interface AiComment {
  id: string
  content: string
  ai_persona: string | null
  is_ai_generated: boolean
  created_at: string
}

// ── Persona definitions ───────────────────────────────────────────────────────
const personas = [
  { id: 'friend',   name: '따뜻한 친구',   desc: '공감과 위로를 주는 친구' },
  { id: 'observer', name: '냉철한 관찰자', desc: '객관적인 시선으로 분석' },
  { id: 'poet',     name: '시인',          desc: '감성적인 언어로 표현' },
]

const personaLabel: Record<string, string> = {
  friend: '따뜻한 친구',
  observer: '냉철한 관찰자',
  poet: '시인',
  custom: '나만의 AI',
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AIExchange() {
  const { addNotification } = useApp();
  const { user, profile } = useAuth();
  const isPremium = profile?.subscription_type === 'premium';

  // ─ Tab state
  const [activeTab, setActiveTab] = useState<'write' | 'reply'>('write');

  // ─ Write state
  const [showSettings, setShowSettings] = useState(true);
  const [selectedPersona, setSelectedPersona] = useState('friend');
  const [customPrompt, setCustomPrompt] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSendSheet, setShowSendSheet] = useState(false);

  // ─ Decoration state
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

  // ─ Reply state (real Supabase data)
  const [todayEntry, setTodayEntry] = useState<AiDiaryEntry | null>(null);
  const [aiComment, setAiComment] = useState<AiComment | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(true);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Load today's AI diary + comment ────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoadingEntry(false); return; }

    // KST date so the AI diary resets at midnight KST, not UTC
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

    async function fetchEntry() {
      // Fetch today's AI diary
      const { data: diary } = await supabase
        .from('diaries')
        .select('id, content, status, created_at, emotion, stamp')
        .eq('author_id', user!.id)
        .eq('exchange_mode', 'ai')
        .eq('created_date', today)
        .limit(1)
        .maybeSingle();

      setTodayEntry(diary ?? null);

      if (diary) {
        setActiveTab('reply');

        // Fetch AI comment if exists
        const { data: comment } = await supabase
          .from('comments')
          .select('id, content, ai_persona, is_ai_generated, created_at')
          .eq('diary_id', diary.id)
          .eq('is_ai_generated', true)
          .maybeSingle();

        setAiComment(comment ?? null);
      }

      setLoadingEntry(false);
    }

    fetchEntry();

    // Load saved custom prompt for premium users
    supabase
      .from('ai_persona_settings')
      .select('tone, system_prompt')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.tone) setSelectedPersona(data.tone);
          if (data.system_prompt) setCustomPrompt(data.system_prompt);
        }
      });

    return () => {};
  }, [user?.id]);

  // ── Realtime subscription for comment arrival ───────────────────────────────
  useEffect(() => {
    if (!todayEntry) return;

    const channel = supabase
      .channel(`ai_comment_${todayEntry.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `diary_id=eq.${todayEntry.id}`,
        },
        async () => {
          const { data } = await supabase
            .from('comments')
            .select('id, content, ai_persona, is_ai_generated, created_at')
            .eq('diary_id', todayEntry.id)
            .eq('is_ai_generated', true)
            .maybeSingle();

          if (data) {
            setAiComment(data);
            setTodayEntry(prev => prev ? { ...prev, status: 'completed' } : prev);
            toast.success('AI 답장이 도착했어요!');
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [todayEntry?.id]);

  // ── Send diary ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!user || !content.trim() || isSending) return;
    setIsSending(true);
    setShowSendSheet(false);

    try {
      // KST date so the AI diary resets at midnight KST, not UTC
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

      // Insert diary with ai exchange mode
      const { data: newDiary, error: insertErr } = await supabase
        .from('diaries')
        .insert({
          author_id: user.id,
          content: content.trim(),
          exchange_mode: 'ai',
          status: 'ai_scheduled',
          created_date: today,
          emotion: decoration.emotion || null,
          stamp: decoration.stamp || null,
        })
        .select('id, content, status, created_at, emotion, stamp')
        .single();

      if (insertErr || !newDiary) {
        console.error('[AIExchange] insert error:', insertErr);
        toast.error('일기 저장에 실패했어요. 다시 시도해 주세요.');
        setIsSending(false);
        return;
      }

      // Schedule AI comment (update status + persist persona)
      const effectivePersona = selectedPersona;
      const effectivePrompt = effectivePersona === 'custom' && isPremium ? customPrompt : undefined;
      await scheduleAIComment(newDiary.id, user.id, effectivePersona, effectivePrompt);

      setTodayEntry(newDiary);
      setAiComment(null);

      const personaName = effectivePersona === 'custom' ? '나만의 AI' : (personaLabel[effectivePersona] ?? effectivePersona);
      addNotification({
        message: `[${personaName}] AI 답장이 내일 오전 8시에 도착합니다.`,
        type: 'ai',
        time: '방금 전',
      });
      toast.success('AI에게 일기를 보냈습니다. 내일 오전 8시에 답장이 도착해요.');
      setActiveTab('reply');
    } catch (err) {
      console.error('[AIExchange] handleSend error:', err);
      toast.error('오류가 발생했어요. 다시 시도해 주세요.');
    } finally {
      setIsSending(false);
    }
  };

  // ── Save custom prompt ──────────────────────────────────────────────────────
  const handleSaveCustomPrompt = async () => {
    if (!user || !isPremium) return;
    setSavingPrompt(true);
    const { error } = await supabase
      .from('ai_persona_settings')
      .upsert(
        { user_id: user.id, tone: 'custom', system_prompt: customPrompt, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    setSavingPrompt(false);
    if (error) toast.error('저장에 실패했어요.');
    else toast.success('나만의 AI 설정이 저장됐어요.');
  };

  const togglePanel = (panel: 'paper' | 'stamp' | 'emotion') => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const emotionInfo = getEmotionInfo(decoration.emotion);
  const paperStyle = getPaperStyle(decoration.paper);

  const isScheduled = todayEntry?.status === 'ai_scheduled';
  const isCompleted = todayEntry?.status === 'completed';

  const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  if (loadingEntry) {
    return (
      <div className="max-w-4xl mx-auto p-8 flex items-center justify-center min-h-screen">
        <p className="font-mono text-[var(--text-muted)]">로딩 중…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 pb-20 font-serif text-[var(--text-primary)] min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 h-[64px] shrink-0">
        <Sparkles className="w-6 h-6 text-[var(--accent)]" />
        <h1 className="text-[24pt] font-serif">AI 일기</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 mb-8 border-b border-[var(--line)] shrink-0">
        <button
          onClick={() => setActiveTab('write')}
          className={`pb-3 border-b-2 font-serif text-[11pt] transition-colors ${activeTab === 'write' ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)]'}`}
        >
          일기 작성
        </button>
        <button
          onClick={() => setActiveTab('reply')}
          className={`pb-3 border-b-2 font-serif text-[11pt] transition-colors ${activeTab === 'reply' ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)]'}`}
        >
          AI 답장 확인
          {(isScheduled || isCompleted) && (
            <span className={`ml-2 inline-block w-2 h-2 rounded-full ${isCompleted ? 'bg-[var(--secondary)]' : 'bg-[var(--accent)]'}`} />
          )}
        </button>
      </div>

      {/* ── Write Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'write' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col flex-1">
          {/* Already sent today — show banner instead of editor */}
          {todayEntry && (
            <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[4px] p-6 mb-8 text-center">
              <p className="font-serif text-[14pt] mb-2">오늘은 이미 일기를 보냈어요.</p>
              <button
                onClick={() => setActiveTab('reply')}
                className="font-mono text-[10pt] text-[var(--accent)] hover:underline"
              >
                답장 확인하기 →
              </button>
            </div>
          )}

          {!todayEntry && (
            <>
              {/* AI Settings */}
              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[4px] p-6 mb-8 transition-all shrink-0">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <h3 className="text-[11pt] font-mono text-[var(--text-muted)]">AI 설정</h3>
                  {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {showSettings && (
                  <div className="mt-6">
                    <div className="text-[10pt] font-mono mb-3">AI 성격 선택</div>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                      {personas.map(p => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPersona(p.id)}
                          className={`min-w-[140px] p-4 border rounded-[4px] cursor-pointer transition-colors ${selectedPersona === p.id ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--line)] hover:border-[var(--accent)]/50'}`}
                        >
                          <div className="font-serif text-[12pt] mb-1">{p.name}</div>
                          <div className="text-[9pt] text-[var(--text-muted)] line-clamp-2">{p.desc}</div>
                        </div>
                      ))}

                      {/* Premium custom persona */}
                      {isPremium ? (
                        <div
                          onClick={() => setSelectedPersona('custom')}
                          className={`min-w-[160px] p-4 border rounded-[4px] cursor-pointer transition-colors flex flex-col gap-2 ${selectedPersona === 'custom' ? 'border-[var(--secondary)] bg-[var(--secondary)]/5' : 'border-[var(--line)] hover:border-[var(--secondary)]/50'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="font-serif text-[12pt]">나만의 AI</div>
                            <span className="px-1.5 py-0.5 bg-[var(--secondary)] text-white text-[7pt] rounded-full font-mono">Pro</span>
                          </div>
                          <div className="text-[9pt] text-[var(--text-muted)]">직접 설정한 페르소나</div>
                        </div>
                      ) : (
                        <div
                          onClick={() => toast.info('프리미엄 기능입니다.')}
                          className="min-w-[140px] p-4 border border-[var(--line)] rounded-[4px] flex flex-col items-center justify-center gap-2 opacity-60 cursor-pointer"
                        >
                          <Lock size={16} />
                          <div className="text-[10pt] font-mono">나만의 AI</div>
                          <div className="px-2 py-0.5 bg-[var(--secondary)] text-white text-[8pt] rounded-full">Pro</div>
                        </div>
                      )}
                    </div>

                    {/* Custom prompt textarea (premium only, when custom selected) */}
                    {isPremium && selectedPersona === 'custom' && (
                      <div className="mt-4">
                        <div className="text-[10pt] font-mono mb-2 text-[var(--text-muted)]">AI 페르소나 설정 (시스템 프롬프트)</div>
                        <textarea
                          value={customPrompt}
                          onChange={e => setCustomPrompt(e.target.value)}
                          placeholder="예) 당신은 철학자입니다. 일기를 읽고 삶의 의미에 대해 심도 있는 코멘트를 한국어로 작성하세요. 200자 이내로 작성하세요."
                          className="w-full h-24 bg-[var(--bg)] border border-[var(--line)] rounded-[4px] px-3 py-2 text-[11pt] font-serif resize-none outline-none focus:border-[var(--secondary)]"
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={handleSaveCustomPrompt}
                            disabled={savingPrompt}
                            className="px-4 py-1.5 bg-[var(--secondary)] text-white text-[9pt] font-mono rounded-[2px] hover:opacity-90 disabled:opacity-50"
                          >
                            {savingPrompt ? '저장 중…' : '설정 저장'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Editor */}
              <div className="relative min-h-[400px] border border-[var(--line)] shadow-sm flex-1" style={paperStyle}>
                {(decoration.paper === 'lined' || decoration.paper === 'vintage') && (
                  <div className="absolute left-12 top-0 bottom-0 w-px bg-[var(--accent)] opacity-30" />
                )}
                {decoration.stamp && (
                  <div className="absolute top-6 right-8 text-[36px] opacity-60 rotate-12 pointer-events-none select-none z-10">
                    {decoration.stamp}
                  </div>
                )}
                <div className="relative z-10 p-12">
                  {emotionInfo && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[18px]">{emotionInfo.emoji}</span>
                      <span className="font-mono text-[9pt] px-3 py-1 rounded-full text-white" style={{ backgroundColor: emotionInfo.color }}>
                        {emotionInfo.id}
                      </span>
                    </div>
                  )}
                  <div className="font-mono text-[10pt] text-[var(--text-muted)] mb-8">{todayStr}</div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="오늘 하루는 어떠셨나요? AI가 들어드릴게요."
                    className="w-full h-[300px] bg-transparent outline-none resize-none font-serif text-[15pt] leading-[2.0]"
                  />
                </div>
              </div>

              {/* Toolbar */}
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
                        className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${activePanel === 'paper' ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--bg)] text-[var(--text-primary)]'}`}
                      >
                        <FileText className="w-4 h-4" />
                        <span className="text-[10pt]">종이</span>
                        {decoration.paper !== 'lined' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] ml-0.5" style={{ opacity: activePanel === 'paper' ? 0 : 1 }} />
                        )}
                      </button>
                      <button
                        onClick={() => togglePanel('stamp')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${activePanel === 'stamp' ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--bg)] text-[var(--text-primary)]'}`}
                      >
                        <Stamp className="w-4 h-4" />
                        <span className="text-[10pt]">스탬프</span>
                        {decoration.stamp && <span className="text-[12px] ml-0.5">{decoration.stamp}</span>}
                      </button>
                      <button
                        onClick={() => togglePanel('emotion')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${activePanel === 'emotion' ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--bg)] text-[var(--text-primary)]'}`}
                      >
                        <Heart className="w-4 h-4" />
                        <span className="text-[10pt]">감정</span>
                        {decoration.emotion && <span className="text-[12px] ml-0.5">{emotionInfo?.emoji}</span>}
                      </button>
                    </div>
                    <button
                      onClick={() => setShowSendSheet(true)}
                      disabled={content.trim().length === 0 || isSending}
                      className="bg-[var(--accent)] text-white px-8 py-2 rounded-[2px] text-[10pt] hover:bg-[var(--accent)]/90 transition-colors disabled:opacity-50"
                    >
                      전송하기
                    </button>
                  </div>
                </div>
              </div>

              {/* Send Sheet */}
              {showSendSheet && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowSendSheet(false)}>
                  <div className="bg-[var(--surface)] w-full max-w-2xl rounded-t-[12px] p-8 shadow-lg animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                    <h3 className="text-[20pt] font-serif mb-2 text-center">AI에게 보냅니다</h3>
                    <p className="text-[11pt] text-[var(--text-muted)] font-serif text-center mb-8">
                      내일 오전 8시에 [{selectedPersona === 'custom' ? '나만의 AI' : (personaLabel[selectedPersona] ?? selectedPersona)}]의 코멘트가 도착합니다.
                    </p>
                    <div className="flex gap-4">
                      <button
                        onClick={handleSend}
                        disabled={isSending}
                        className="flex-1 bg-[var(--accent)] text-white py-3 rounded-[2px] disabled:opacity-50"
                      >
                        {isSending ? '전송 중…' : '전송하기'}
                      </button>
                      <button onClick={() => setShowSendSheet(false)} className="flex-1 text-[var(--text-muted)]">취소</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Reply Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'reply' && (
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          {!todayEntry ? (
            /* No diary sent today */
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-[20pt] italic text-[var(--text-muted)] mb-4">아직 도착한 답장이 없어요.</div>
              <p className="text-[14pt] text-[var(--text-muted)]">일기를 보내면 다음 날 오전 8시에 답장이 도착해요.</p>
              <button
                onClick={() => setActiveTab('write')}
                className="mt-6 px-6 py-2 border border-[var(--line)] text-[11pt] font-mono hover:bg-[var(--surface)] transition-colors rounded-[2px]"
              >
                일기 작성하러 가기
              </button>
            </div>
          ) : (
            <>
              {/* My diary panel */}
              <div className="flex-[2] overflow-y-auto border border-[var(--line)] bg-[var(--surface)] p-8 relative min-h-0">
                <div className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--line)] pb-4 mb-4 flex justify-between">
                  <span className="font-mono text-[10pt] text-[var(--text-muted)]">내가 보낸 일기</span>
                  <span className="font-mono text-[10pt] text-[var(--text-muted)]">
                    {new Date(todayEntry.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                  </span>
                </div>
                <div className="font-serif text-[14pt] leading-[1.8] text-[var(--text-primary)] opacity-80 whitespace-pre-wrap">
                  {todayEntry.content}
                </div>
              </div>

              {/* AI reply panel */}
              <div className="flex-[3] overflow-y-auto bg-[var(--bg)] border border-[var(--line)] p-8 relative min-h-0">
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-[var(--bg)] z-10 pb-4 border-b border-[var(--line)]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--secondary)]" />
                    <span className="font-mono text-[10pt] text-[var(--text-muted)]">
                      {aiComment ? 'AI가 작성한 답장입니다.' : '답장 대기 중…'}
                    </span>
                  </div>
                  {aiComment?.ai_persona && (
                    <span className="font-mono text-[9pt] text-[var(--secondary)] px-2 py-0.5 border border-[var(--secondary)] rounded-full">
                      {personaLabel[aiComment.ai_persona] ?? aiComment.ai_persona}
                    </span>
                  )}
                </div>

                {isScheduled && !aiComment && (
                  /* Waiting for next-day delivery */
                  <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                    <Sparkles className="w-8 h-8 text-[var(--accent)] opacity-50" />
                    <p className="font-serif text-[15pt] text-[var(--text-muted)]">내일 오전 8시에 도착합니다.</p>
                    <p className="font-mono text-[10pt] text-[var(--text-muted)]">AI가 일기를 읽고 코멘트를 준비하고 있어요.</p>
                  </div>
                )}

                {aiComment && (
                  <>
                    {aiComment.is_ai_generated && (
                      <div className="bg-[var(--line)]/20 border border-[var(--line)] px-4 py-3 mb-6 rounded-[2px]">
                        <p className="font-mono text-[9pt] text-[var(--text-muted)]">
                          AI가 작성한 코멘트입니다.
                        </p>
                      </div>
                    )}
                    <div className="relative min-h-[300px]">
                      <div
                        className="absolute inset-0 pointer-events-none opacity-50"
                        style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, var(--line) 31px, var(--line) 32px)' }}
                      />
                      <div className="relative z-10 font-serif text-[15pt] leading-[2.0] whitespace-pre-wrap">
                        {aiComment.content}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 mt-4 shrink-0">
                <button
                  onClick={() => {
                    setContent('');
                    setTodayEntry(null);
                    setAiComment(null);
                    setActiveTab('write');
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-[var(--line)] hover:bg-[var(--surface)] transition-colors rounded-[2px]"
                >
                  <RefreshCcw size={14} />
                  <span className="text-[10pt]">다시 보내기</span>
                </button>
                {aiComment && (
                  <button
                    onClick={() => {
                      const blob = new Blob([`${todayEntry.content}\n\n---\n\n${aiComment.content}`], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `AI일기_${new Date(todayEntry.created_at).toISOString().split('T')[0]}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <Download size={14} />
                    <span className="text-[10pt]">이 답장 저장</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
