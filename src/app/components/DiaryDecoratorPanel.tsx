import type { CSSProperties } from "react";
import { X } from "lucide-react";

export interface DiaryDecoration {
  paper: 'lined' | 'grid' | 'dot' | 'plain' | 'vintage';
  stamp: string | null;
  emotion: string | null;
}

export const defaultDecoration: DiaryDecoration = {
  paper: 'lined',
  stamp: null,
  emotion: null,
};

interface DiaryDecoratorPanelProps {
  activePanel: 'paper' | 'stamp' | 'emotion' | null;
  decoration: DiaryDecoration;
  onChange: (d: DiaryDecoration) => void;
  onClose: () => void;
}

export const PAPER_OPTIONS = [
  {
    id: 'lined' as const,
    label: '줄지 노트',
    preview: 'repeating-linear-gradient(transparent, transparent 31px, var(--pattern-line) 31px, var(--pattern-line) 32px)',
    bg: 'var(--surface)',
  },
  {
    id: 'grid' as const,
    label: '모눈 노트',
    preview: 'repeating-linear-gradient(var(--pattern-line) 0, var(--pattern-line) 1px, transparent 0, transparent 50%), repeating-linear-gradient(90deg, var(--pattern-line) 0, var(--pattern-line) 1px, transparent 0, transparent 50%)',
    bg: 'var(--surface)',
  },
  {
    id: 'dot' as const,
    label: '점선 노트',
    preview: 'radial-gradient(circle, var(--pattern-line) 1px, transparent 1px)',
    bg: 'var(--surface)',
  },
  {
    id: 'plain' as const,
    label: '무지 노트',
    preview: 'none',
    bg: 'var(--surface)',
  },
  {
    id: 'vintage' as const,
    label: '빈티지 노트',
    preview: 'repeating-linear-gradient(transparent, transparent 31px, var(--pattern-line) 31px, var(--pattern-line) 32px)',
    bg: 'var(--surface)',
  },
];

export const STAMP_OPTIONS = [
  { id: '📮', label: '우체통' },
  { id: '🌸', label: '벚꽃' },
  { id: '☁️', label: '구름' },
  { id: '⭐', label: '별' },
  { id: '🍃', label: '나뭇잎' },
  { id: '📚', label: '책' },
  { id: '🌙', label: '달' },
  { id: '✉️', label: '편지' },
  { id: '🕯️', label: '초' },
  { id: '🌿', label: '풀잎' },
  { id: '🦋', label: '나비' },
  { id: '☕', label: '커피' },
];

const EMOTION_OPTIONS = [
  { id: '기쁨', emoji: '😊', color: '#F5C842' },
  { id: '슬픔', emoji: '😔', color: '#7BA7D4' },
  { id: '화남', emoji: '😤', color: '#E08080' },
  { id: '평온', emoji: '😌', color: '#8FA68E' },
  { id: '불안', emoji: '😰', color: '#B89FD4' },
  { id: '피곤', emoji: '😴', color: '#B8AFA0' },
  { id: '설렘', emoji: '🥰', color: '#E8A0B4' },
  { id: '그리움', emoji: '🫧', color: '#90C0D4' },
];

export function DiaryDecoratorPanel({ activePanel, decoration, onChange, onClose }: DiaryDecoratorPanelProps) {
  if (!activePanel) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--surface)] border border-[var(--line)] shadow-lg z-50 animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--line)] bg-[var(--bg)]">
        <span className="font-mono text-[9pt] text-[var(--text-muted)] uppercase tracking-wider">
          {activePanel === 'paper' ? '종이 스타일' : activePanel === 'stamp' ? '스탬프' : '오늘의 감정'}
        </span>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-4">
        {activePanel === 'paper' && (
          <div className="flex gap-3 flex-wrap">
            {PAPER_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => onChange({ ...decoration, paper: opt.id })}
                className={`flex flex-col items-center gap-1.5 group`}
              >
                <div
                  className={`w-16 h-20 rounded-[2px] border-2 transition-all ${decoration.paper === opt.id ? 'border-[var(--accent)] shadow-md' : 'border-[var(--line)] hover:border-[var(--accent)]/50'}`}
                  style={{
                    backgroundColor: opt.bg,
                    backgroundImage: opt.preview,
                    backgroundSize: opt.id === 'dot' ? '20px 20px' : opt.id === 'grid' ? '20px 20px' : undefined,
                  }}
                />
                <span className={`font-mono text-[8pt] ${decoration.paper === opt.id ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {activePanel === 'stamp' && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onChange({ ...decoration, stamp: null })}
              className={`w-14 h-14 border-2 rounded-[2px] flex items-center justify-center text-[9pt] font-mono text-[var(--text-muted)] transition-all ${decoration.stamp === null ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--line)] hover:border-[var(--accent)]/50'}`}
            >
              없음
            </button>
            {STAMP_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => onChange({ ...decoration, stamp: opt.id })}
                className={`w-14 h-14 border-2 rounded-[2px] flex flex-col items-center justify-center gap-0.5 transition-all ${decoration.stamp === opt.id ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-md' : 'border-[var(--line)] hover:border-[var(--accent)]/50'}`}
              >
                <span className="text-[20px] leading-none">{opt.id}</span>
                <span className="font-mono text-[7pt] text-[var(--text-muted)]">{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {activePanel === 'emotion' && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onChange({ ...decoration, emotion: null })}
              className={`px-4 py-2 border-2 rounded-full text-[9pt] font-mono transition-all ${decoration.emotion === null ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--accent)]/50'}`}
            >
              없음
            </button>
            {EMOTION_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => onChange({ ...decoration, emotion: opt.id })}
                className={`px-4 py-2 border-2 rounded-full text-[9pt] font-mono transition-all flex items-center gap-1.5 ${decoration.emotion === opt.id ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--accent)]/50'}`}
                style={decoration.emotion === opt.id ? { backgroundColor: opt.color + '20', borderColor: opt.color } : {}}
              >
                <span>{opt.emoji}</span>
                <span>{opt.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to get paper style object from decoration
export function getPaperStyle(paper: DiaryDecoration['paper']): CSSProperties {
  const opt = PAPER_OPTIONS.find(o => o.id === paper)!;
  const style: CSSProperties = {
    backgroundColor: opt.bg,
  };
  if (opt.preview !== 'none') {
    style.backgroundImage = opt.preview;
  }
  if (paper === 'dot' || paper === 'grid') {
    style.backgroundSize = '20px 20px';
  }
  return style;
}

export function getEmotionInfo(emotion: string | null) {
  if (!emotion) return null;
  return EMOTION_OPTIONS.find(o => o.id === emotion) ?? null;
}