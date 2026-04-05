import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, User, Users, Sparkles } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { ArchiveEntry } from "../context/AppContext";
import { getPaperStyle, getEmotionInfo } from "../components/DiaryDecoratorPanel";

type DiaryType = 'anonymous' | 'group' | 'ai';

const emotionMap: Record<string, string> = {
  '기쁨': '😊 기쁨',
  '슬픔': '😢 슬픔',
  '화남': '😡 화남',
  '평온': '😌 평온',
  '불안': '😰 불안',
  '피곤': '😴 피곤',
  '설렘': '🤩 설렘',
  '그리움': '😔 그리움',
};

const typeLabel: Record<DiaryType, string> = {
  anonymous: '익명 교환',
  group: '그룹 교환',
  ai: 'AI 교환',
};

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${y}. ${m}. ${d}`;
}

export function Archive() {
  const { archiveEntries, archiveLoading: loading } = useApp();
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [activeFilter, setActiveFilter] = useState<'all' | DiaryType>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDiary, setSelectedDiary] = useState<any>(null);

  const handleDiaryClick = (diary: any) => {
    setSelectedDiary(diary);
    setView('detail');
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setSelectedMonth(newDate);
  };

  const filteredDiaries = archiveEntries.filter(e => {
    if (activeFilter !== 'all' && e.type !== activeFilter) return false;
    const entryDate = new Date(e.date);
    return (
      entryDate.getFullYear() === selectedMonth.getFullYear() &&
      entryDate.getMonth() === selectedMonth.getMonth()
    );
  });

  if (view === 'list') {
    return (
      <div className="max-w-4xl mx-auto p-8 font-serif text-[var(--text-primary)] min-h-screen">
        {/* Header */}
        <h1 className="text-[24pt] font-serif mb-8 h-[64px] flex items-center">기록 보관함</h1>

        {/* Filter Tabs */}
        <div className="flex gap-8 mb-8 border-b border-[var(--line)]">
          {(['all', 'anonymous', 'group', 'ai'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`pb-3 font-serif text-[11pt] transition-colors ${activeFilter === filter ? 'border-b-2 border-[var(--accent)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              {filter === 'all' ? '전체' : typeLabel[filter]}
            </button>
          ))}
        </div>

        {/* Month Picker */}
        <div className="flex items-center justify-center gap-8 mb-12 select-none">
          <button onClick={() => handleMonthChange('prev')} className="hover:text-[var(--accent)] transition-colors">
            <ChevronLeft size={24} strokeWidth={1.5} />
          </button>
          <span className="text-[16pt] font-serif min-w-[160px] text-center">
            {selectedMonth.getFullYear()}년 {selectedMonth.getMonth() + 1}월
          </span>
          <button onClick={() => handleMonthChange('next')} className="hover:text-[var(--accent)] transition-colors">
            <ChevronRight size={24} strokeWidth={1.5} />
          </button>
        </div>

        {/* Diary List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20 text-[var(--text-muted)] font-serif text-[14pt] italic">
              불러오는 중...
            </div>
          ) : filteredDiaries.length === 0 ? (
            <div className="text-center py-20 text-[var(--text-muted)] font-serif text-[14pt] italic">
              이 달에 작성한 일기가 없어요.
            </div>
          ) : (
            filteredDiaries.map(diary => (
              <div
                key={diary.id}
                onClick={() => handleDiaryClick(diary)}
                className="bg-[var(--surface)] border border-[var(--line)] h-[80px] flex items-stretch hover:border-[var(--accent)] transition-colors cursor-pointer group rounded-[4px] overflow-hidden"
              >
                {/* Type Color Bar */}
                <div className={`w-1.5 ${
                  diary.type === 'anonymous' ? 'bg-[var(--accent)]' :
                  diary.type === 'group' ? 'bg-[var(--secondary)]' : 'bg-[#A89CC8]'
                }`} />

                <div className="flex-1 px-6 flex items-center justify-between">
                  <div>
                    <div className="text-[14pt] font-serif text-[var(--text-primary)] mb-1 line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
                      {diary.title || diary.content.slice(0, 24) + (diary.content.length > 24 ? '...' : '')}
                    </div>
                    <div className="flex items-center gap-2">
                      {diary.emotion && (
                        <span className="text-[9pt] font-mono border border-[var(--line)] px-2 rounded-full text-[var(--text-muted)]">
                          {emotionMap[diary.emotion] || diary.emotion}
                        </span>
                      )}
                      <span className="text-[9pt] font-mono text-[var(--text-muted)]">
                        {formatDate(diary.date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-[9pt] font-mono text-[var(--text-muted)]">
                      {diary.type === 'anonymous' ? <User size={12} /> : diary.type === 'group' ? <Users size={12} /> : <Sparkles size={12} />}
                      {typeLabel[diary.type]}
                    </div>
                    <div className={`text-[9pt] font-mono ${diary.status === 'completed' ? 'text-[var(--secondary)]' : 'text-[var(--text-muted)]'}`}>
                      {diary.status === 'completed' ? '완료' : '진행중'}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (view === 'detail') {
    const selectedEmotionInfo = selectedDiary?.emotion ? getEmotionInfo(selectedDiary.emotion) : null;
    return (
      <div className="max-w-4xl mx-auto p-8 font-serif text-[var(--text-primary)] min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 h-[64px] border-b border-[var(--line)]">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="hover:text-[var(--accent)] transition-colors">
              <ArrowLeft className="w-6 h-6 stroke-[1.5]" />
            </button>
            <span className="font-mono text-[11pt] text-[var(--text-muted)]">{selectedDiary && formatDate(selectedDiary.date)}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9pt] font-mono border ${
              selectedDiary?.type === 'anonymous' ? 'border-[var(--accent)] text-[var(--accent)]' :
              selectedDiary?.type === 'group' ? 'border-[var(--secondary)] text-[var(--secondary)]' :
              'border-[#A89CC8] text-[#A89CC8]'
            }`}>
              {selectedDiary && typeLabel[selectedDiary.type as DiaryType]}
            </span>
          </div>
        </div>

        {/* My Diary */}
        <div
          className="flex-[3] relative border border-[var(--line)] p-12 mb-4 overflow-hidden shadow-sm min-h-[400px]"
          style={getPaperStyle((selectedDiary?.paper_design || 'lined') as any)}
        >
          {/* 마진 라인 (줄지/빈티지) */}
          {(selectedDiary?.paper_design === 'lined' || selectedDiary?.paper_design === 'vintage' || !selectedDiary?.paper_design) && (
            <div className="absolute left-12 top-0 bottom-0 w-px bg-[var(--accent)] opacity-30 pointer-events-none" />
          )}
          {/* 스탬프 */}
          {selectedDiary?.stamp && (
            <div className="absolute top-6 right-8 text-[36px] opacity-60 rotate-12 pointer-events-none select-none z-10">
              {selectedDiary.stamp}
            </div>
          )}
          <div className="font-mono text-[10pt] text-[var(--text-muted)] mb-4 relative z-10">내가 쓴 일기</div>
          {selectedDiary?.title && (
            <div className="relative z-10 font-serif text-[18pt] mb-4">{selectedDiary.title}</div>
          )}
          <div className="relative z-10 font-serif text-[15pt] leading-[2.0] whitespace-pre-wrap">
            {selectedDiary?.content || "내용이 없습니다."}
          </div>
          {selectedEmotionInfo && (
            <div className="mt-8 relative z-10 flex items-center gap-2">
              <span className="text-[18px]">{selectedEmotionInfo.emoji}</span>
              <span className="font-mono text-[9pt] px-3 py-1 rounded-full text-white" style={{ backgroundColor: selectedEmotionInfo.color }}>
                {selectedEmotionInfo.id}
              </span>
            </div>
          )}
        </div>

        {/* Dashed Line */}
        <div className="h-px border-t border-dashed border-[var(--line)] w-full mb-4 shrink-0" />

        {/* Received Comment */}
        <div className="flex-[2] bg-[var(--bg)] border border-[var(--line)] p-8 relative min-h-[250px]">
          <div className="font-mono text-[10pt] text-[var(--text-muted)] mb-4">받은 답장</div>
          {selectedDiary?.status === 'completed' ? (
            <>
              {selectedDiary?.isAiComment && (
                <div className="flex items-center gap-1.5 font-mono text-[9pt] text-[var(--text-muted)] italic mb-4">
                  <Sparkles size={12} />
                  24시간 내 응답이 없어 AI가 대신 답장을 작성했습니다.
                </div>
              )}
              <div className="relative font-serif text-[15pt] leading-[2.0] whitespace-pre-wrap">
                {selectedDiary?.comment || "답장 내용입니다."}
              </div>
            </>
          ) : (
            <div className="italic text-[var(--text-muted)] text-[14pt]">아직 답장이 도착하지 않았어요.</div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
