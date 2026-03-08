import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Lock, RefreshCcw, FileText, Stamp, Heart, Download } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../context/AppContext";
import {
  DiaryDecoratorPanel,
  defaultDecoration,
  getPaperStyle,
  getEmotionInfo,
  type DiaryDecoration,
} from "../components/DiaryDecoratorPanel";

export function AIExchange() {
  const { aiDiaryWrittenToday, setAiDiaryWrittenToday, addNotification, addArchiveEntry, updateArchiveEntry } = useApp();
  const [activeTab, setActiveTab] = useState<'write' | 'reply'>(aiDiaryWrittenToday ? 'reply' : 'write');

  // Write State
  const [showSettings, setShowSettings] = useState(true);
  const [selectedPersona, setSelectedPersona] = useState('friend');
  const [content, setContent] = useState("");
  const [showSendSheet, setShowSendSheet] = useState(false);

  // Decoration state - localStorage에서 불러오기
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

  // Reply State
  const [hasReply, setHasReply] = useState(true);
  const [isAutoReply, setIsAutoReply] = useState(true); // AI 자동 답장 여부 (기본 true)

  const personas = [
    { id: 'friend', name: '따뜻한 친구', desc: '공감과 위로를 주는 친구' },
    { id: 'observer', name: '냉철한 관찰자', desc: '객관적인 시선으로 분석' },
    { id: 'poet', name: '시인', desc: '감성적인 언어로 표현' },
  ];

  const handleSend = () => {
    setShowSendSheet(false);
    setAiDiaryWrittenToday(true);
    addNotification({ message: `[${personas.find(p => p.id === selectedPersona)?.name}] AI 답장이 내일 오전 8시에 도착합니다.`, type: 'ai', time: '방금 전' });
    toast.success("AI에게 일기를 보냈습니다. 내일 오전 8시에 답장이 도착해요.");
    setActiveTab('reply');

    const entryId = addArchiveEntry({
      date: new Date().toISOString().split('T')[0],
      content,
      type: 'ai',
      emotion: decoration.emotion || undefined,
      stamp: decoration.stamp || undefined,
      status: 'waiting',
    });

    // 데모: 5초 후 AI 답장 시뮬레이션
    setTimeout(() => {
      updateArchiveEntry(entryId, {
        status: 'completed',
        comment: '미래에 대한 불안감은 누구나 느끼는 자연스러운 감정이에요. 지금 당장 답을 찾으려 하지 않아도 괜찮아요. 하루하루를 버티는 것도 대단한 일이니까요.',
      });
    }, 5000);
  };

  const togglePanel = (panel: 'paper' | 'stamp' | 'emotion') => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const emotionInfo = getEmotionInfo(decoration.emotion);
  const paperStyle = getPaperStyle(decoration.paper);

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
        </button>
      </div>

      {activeTab === 'write' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col flex-1">
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
                  {/* Paid Custom */}
                  <div className="min-w-[140px] p-4 border border-[var(--line)] rounded-[4px] flex flex-col items-center justify-center gap-2 opacity-60">
                    <Lock size={16} />
                    <div className="text-[10pt] font-mono">나만의 AI</div>
                    <div className="px-2 py-0.5 bg-[var(--secondary)] text-white text-[8pt] rounded-full">Pro</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="relative min-h-[400px] border border-[var(--line)] shadow-sm flex-1" style={paperStyle}>
            {/* 좌측 마진 선 (줄지/빈티지에서만) */}
            {(decoration.paper === 'lined' || decoration.paper === 'vintage') && (
              <div className="absolute left-12 top-0 bottom-0 w-px bg-[var(--accent)] opacity-30" />
            )}

            {/* 스탬프 */}
            {decoration.stamp && (
              <div className="absolute top-6 right-8 text-[36px] opacity-60 rotate-12 pointer-events-none select-none z-10">
                {decoration.stamp}
              </div>
            )}

            <div className="relative z-10 p-12">
              {/* 감정 태그 */}
              {emotionInfo && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[18px]">{emotionInfo.emoji}</span>
                  <span className="font-mono text-[9pt] px-3 py-1 rounded-full text-white" style={{ backgroundColor: emotionInfo.color }}>
                    {emotionInfo.id}
                  </span>
                </div>
              )}
              <div className="font-mono text-[10pt] text-[var(--text-muted)] mb-8">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="오늘 하루는 어떠셨나요? AI가 들어드릴게요."
                className="w-full h-[300px] bg-transparent outline-none resize-none font-serif text-[15pt] leading-[2.0]"
              />
            </div>
          </div>

          {/* Toolbar — fixed, positioned below content */}
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
                    {decoration.stamp && (
                      <span className="text-[12px] ml-0.5">{decoration.stamp}</span>
                    )}
                  </button>
                  <button
                    onClick={() => togglePanel('emotion')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${activePanel === 'emotion' ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--bg)] text-[var(--text-primary)]'}`}
                  >
                    <Heart className="w-4 h-4" />
                    <span className="text-[10pt]">감정</span>
                    {decoration.emotion && (
                      <span className="text-[12px] ml-0.5">{emotionInfo?.emoji}</span>
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setShowSendSheet(true)}
                  disabled={content.length === 0}
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
                  내일 오전 8시에 [{personas.find(p => p.id === selectedPersona)?.name}]의 코멘트가 도착합니다.
                </p>
                <div className="flex gap-4">
                  <button onClick={handleSend} className="flex-1 bg-[var(--accent)] text-white py-3 rounded-[2px]">전송하기</button>
                  <button onClick={() => setShowSendSheet(false)} className="flex-1 text-[var(--text-muted)]">취소</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reply' && (
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          {!hasReply ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-[20pt] italic text-[var(--text-muted)] mb-4">아직 도착한 답장이 없어요.</div>
              <p className="text-[14pt] text-[var(--text-muted)]">일기를 보내면 다음 날 오전 8시에 답장이 도착해요.</p>
            </div>
          ) : (
            <>
              {/* My Diary Viewer (40%) */}
              <div className="flex-[2] overflow-y-auto border border-[var(--line)] bg-[var(--surface)] p-8 relative min-h-0">
                <div className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--line)] pb-4 mb-4 flex justify-between">
                  <span className="font-mono text-[10pt] text-[var(--text-muted)]">내가 보낸 일기</span>
                  <span className="font-mono text-[10pt] text-[var(--text-muted)]">2026. 03. 01</span>
                </div>
                <div className="font-serif text-[14pt] leading-[1.8] text-[var(--text-primary)] opacity-80">
                  요즘 들어 생각이 많아진다. 미래에 대한 불안감 때문일까?
                  무엇을 해야 할지 모르겠다. 그냥 하루하루 버티는 기분이다.
                </div>
              </div>

              {/* AI Reply Viewer (60%) */}
              <div className="flex-[3] overflow-y-auto bg-[var(--bg)] border border-[var(--line)] p-8 relative min-h-0">
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-[var(--bg)] z-10 pb-4 border-b border-[var(--line)]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--secondary)]" />
                    <span className="font-mono text-[10pt] text-[var(--text-muted)]">AI가 작성한 답장입니다.</span>
                  </div>
                  <span className="font-mono text-[9pt] text-[var(--secondary)] px-2 py-0.5 border border-[var(--secondary)] rounded-full">따뜻한 친구</span>
                </div>

                {/* AI 자동 보완 안내 배너 */}
                {isAutoReply && (
                  <div className="bg-[var(--line)]/20 border border-[var(--line)] px-4 py-3 mb-6 rounded-[2px]">
                    <p className="font-mono text-[9pt] text-[var(--text-muted)]">
                      24시간 내 응답이 없어 AI가 대신 답장을 작성했습니다.
                    </p>
                  </div>
                )}

                <div className="relative min-h-[300px]">
                  <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, var(--line) 31px, var(--line) 32px)' }} />
                  <div className="relative z-10 font-serif text-[15pt] leading-[2.0]">
                    미래에 대한 불안감은 누구나 느끼는 자연스러운 감정이에요.
                    지금 당장 답을 찾으려 하지 않아도 괜찮아요.
                    하루하루를 버티는 것도 대단한 일이니까요.
                    스스로를 너무 몰아세우지 마세요.
                    잠시 쉬어가도 괜찮아요.
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 mt-4 shrink-0">
                <button
                  onClick={() => setActiveTab('write')}
                  className="flex items-center gap-2 px-4 py-2 border border-[var(--line)] hover:bg-[var(--surface)] transition-colors rounded-[2px]"
                >
                  <RefreshCcw size={14} />
                  <span className="text-[10pt]">다시 보내기</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  <Download size={14} />
                  <span className="text-[10pt]">이 답장 저장</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}