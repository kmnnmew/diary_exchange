import { useState } from "react";
import { Lock, Sun, Moon, Flower2, Check } from "lucide-react";
import { toast } from "sonner";
import { useApp, type ThemeType } from "../context/AppContext";

export function Customize() {
  const { theme, setTheme } = useApp();

  const [selectedPaper, setSelectedPaper] = useState(() => {
    return localStorage.getItem('defaultPaper') || 'lined';
  });
  const [selectedStamp, setSelectedStamp] = useState<string | null>(() => {
    return localStorage.getItem('defaultStamp') || null;
  });
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>(theme);
  const [stampCategory, setStampCategory] = useState<'emotion' | 'weather' | 'date' | 'sticker'>('emotion');

  const saveSettings = () => {
    localStorage.setItem('defaultPaper', selectedPaper);
    localStorage.setItem('defaultStamp', selectedStamp || '');
    setTheme(selectedTheme);
    toast.success("꾸미기 설정이 저장되었습니다!");
  };

  const paperDesigns = [
    { id: 'lined', name: '줄지 노트', premium: false },
    { id: 'grid', name: '모눈 노트', premium: false },
    { id: 'dot', name: '점선 노트', premium: false },
    { id: 'plain', name: '무지 노트', premium: false },
    { id: 'vintage', name: '빈티지 노트', premium: false },
    { id: 'pastel', name: '파스텔', premium: true },
    { id: 'spring', name: '봄 한정', premium: true },
    { id: 'summer', name: '여름 한정', premium: true },
  ];

  const stamps = {
    emotion: ['😊', '😢', '😡', '😴', '🤔', '😍', '😱', '🥰'],
    weather: ['☀️', '🌤️', '☁️', '🌧️', '⛈️', '🌈', '❄️', '🌙'],
    date: ['📅', '📆', '🗓️', '⏰', '📮', '✉️', '🌸', '☁️'],
    sticker: ['🌿', '🍃', '⭐', '🦋', '☕', '🕯️', '📚', '🌙'],
  };

  const getPaperPreview = (paperId: string): React.CSSProperties => {
    switch (paperId) {
      case 'lined': return { backgroundImage: 'repeating-linear-gradient(transparent, transparent 15px, var(--pattern-line) 15px, var(--pattern-line) 16px)', backgroundColor: 'var(--surface)' };
      case 'grid': return { backgroundImage: 'repeating-linear-gradient(var(--pattern-line) 0, var(--pattern-line) 1px, transparent 0, transparent 16px), repeating-linear-gradient(90deg, var(--pattern-line) 0, var(--pattern-line) 1px, transparent 0, transparent 16px)', backgroundColor: 'var(--surface)', backgroundSize: '16px 16px' };
      case 'dot': return { backgroundImage: 'radial-gradient(circle, var(--pattern-line) 1px, transparent 1px)', backgroundSize: '16px 16px', backgroundColor: 'var(--surface)' };
      case 'plain': return { backgroundColor: 'var(--surface)' };
      case 'vintage': return { backgroundImage: 'repeating-linear-gradient(transparent, transparent 15px, var(--pattern-line) 15px, var(--pattern-line) 16px)', backgroundColor: 'var(--surface)' };
      default: return { backgroundColor: 'var(--surface)' };
    }
  };

  const themeOptions: {
    id: ThemeType;
    label: string;
    icon: typeof Sun;
    desc: string;
    preview: { bg: string; text: string; accent: string };
  }[] = [
    {
      id: 'light',
      label: '라이트',
      icon: Sun,
      desc: '따뜻한 크림 베이지',
      preview: { bg: '#F5F0E8', text: '#2C2416', accent: '#C4855A' },
    },
    {
      id: 'dark',
      label: '다크',
      icon: Moon,
      desc: '편안한 다크 모드',
      preview: { bg: '#1A1612', text: '#EDE6D6', accent: '#C4855A' },
    },
    {
      id: 'pastel',
      label: '파스텔',
      icon: Flower2,
      desc: '부드러운 핑크 톤',
      preview: { bg: '#FDF0F5', text: '#3D2535', accent: '#C97EA0' },
    },
  ];

  return (
    <div className="p-12 max-w-7xl mx-auto font-serif text-[var(--text-primary)]">
      <h1 className="text-[24pt] mb-8 h-[64px] flex items-center">꾸미기 설정</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* 좌측: 실시간 미리보기 */}
        <div>
          <div className="sticky top-8">
            <h2 className="text-[16pt] font-serif mb-4">미리보기</h2>
            <div
              className="border border-[var(--line)] rounded-[4px] p-8 aspect-[3/4] relative overflow-hidden shadow-sm"
              style={getPaperPreview(selectedPaper)}
            >
              <div className="text-[10pt] text-[var(--text-muted)] mb-6 font-mono" style={{ color: '#9A7486' }}>
                {new Date().getFullYear()}.{String(new Date().getMonth() + 1).padStart(2, '0')}.{String(new Date().getDate()).padStart(2, '0')}
              </div>
              <div className="space-y-4 font-serif leading-[2.0]" style={{ color: '#2C2416' }}>
                <p>오늘은 정말 좋은 하루였다.</p>
                <p>아침에 일어나서 커피 한 잔을 마시며...</p>
                <p style={{ color: '#9A7486', fontSize: '12px' }}>창 밖으로 햇살이 따뜻하게 들어왔다.</p>
              </div>
              {selectedStamp && (
                <div className="absolute bottom-8 right-8 text-4xl opacity-70 rotate-12">
                  {selectedStamp}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 우측: 설정 패널 */}
        <div className="space-y-10">
          {/* 플랫폼 테마 */}
          <div>
            <h3 className="text-[16pt] font-serif mb-4">플랫폼 테마</h3>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedTheme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedTheme(opt.id)}
                    className={`relative flex flex-col items-center gap-3 p-4 border-2 rounded-[4px] transition-all ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-[var(--line)] hover:border-[var(--accent)]/50'
                    }`}
                  >
                    {/* 컬러 프리뷰 */}
                    <div
                      className="w-full h-10 rounded-[2px] flex items-center justify-center gap-2"
                      style={{ backgroundColor: opt.preview.bg }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.preview.accent }} />
                      <div className="h-1 w-8 rounded" style={{ backgroundColor: opt.preview.text, opacity: 0.3 }} />
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="font-mono text-[10pt]">{opt.label}</span>
                      </div>
                      <span className="text-[8pt] text-[var(--text-muted)] font-mono">{opt.desc}</span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-[var(--accent)] rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 종이 디자인 선택 */}
          <div>
            <h3 className="text-[16pt] font-serif mb-4">종이 디자인</h3>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              {paperDesigns.map((paper) => (
                <button
                  key={paper.id}
                  onClick={() => !paper.premium && setSelectedPaper(paper.id)}
                  disabled={paper.premium}
                  className={`relative min-w-[100px] h-28 border-2 rounded-[4px] transition-all flex-shrink-0 ${
                    selectedPaper === paper.id
                      ? 'border-[var(--accent)]'
                      : 'border-[var(--line)] hover:border-[var(--accent)]/50'
                  } ${paper.premium ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={getPaperPreview(paper.id)}
                >
                  {paper.premium && (
                    <div className="absolute top-2 right-2 bg-white/80 rounded-full p-1">
                      <Lock className="w-3 h-3 text-gray-500" />
                    </div>
                  )}
                  {selectedPaper === paper.id && !paper.premium && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-[var(--accent)] rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="text-[9pt] bg-white/80 px-2 py-0.5 rounded font-mono text-gray-600">
                      {paper.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 스탬프 선택 */}
          <div>
            <h3 className="text-[16pt] font-serif mb-4">스탬프 & 스티커</h3>

            {/* 카테고리 탭 */}
            <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
              {(Object.keys(stamps) as Array<keyof typeof stamps>).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setStampCategory(cat)}
                  className={`px-3 py-1.5 border rounded-full transition-colors font-mono text-[9pt] whitespace-nowrap ${
                    stampCategory === cat
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--line)] text-[var(--text-muted)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  {cat === 'emotion' ? '감정' : cat === 'weather' ? '날씨' : cat === 'date' ? '날짜' : '스티커'}
                </button>
              ))}
            </div>

            {/* 스탬프 그리드 */}
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => setSelectedStamp(null)}
                className={`aspect-square flex items-center justify-center text-[9pt] font-mono border-2 rounded-[4px] hover:border-[var(--accent)] transition-colors ${
                  selectedStamp === null ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--line)]'
                }`}
              >
                없음
              </button>
              {stamps[stampCategory].map((stamp, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedStamp(stamp)}
                  className={`aspect-square flex items-center justify-center text-3xl border-2 rounded-[4px] hover:border-[var(--accent)] transition-colors relative ${
                    selectedStamp === stamp ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--line)]'
                  }`}
                >
                  {stamp}
                  {selectedStamp === stamp && (
                    <div className="absolute top-1 right-1 w-3 h-3 bg-[var(--accent)] rounded-full flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 유료 업그레이드 배너 */}
          <div className="border border-[var(--accent)] bg-[var(--accent)]/5 rounded-[4px] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-serif text-[13pt] mb-1">프리미엄으로 업그레이드</h4>
                <p className="text-[10pt] text-[var(--text-muted)] font-mono">
                  시즌 한정 테마 · 고급 스탬프 · AI 성격 커스텀
                </p>
              </div>
              <button className="px-5 py-2 bg-[var(--accent)] text-white hover:opacity-90 transition-opacity whitespace-nowrap rounded-[2px] text-[10pt] shrink-0">
                업그레이드 →
              </button>
            </div>
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={saveSettings}
            className="w-full py-3.5 bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 transition-opacity rounded-[2px] font-mono text-[11pt]"
          >
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
}
