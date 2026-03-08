import { Link } from "react-router";
import { Mail, Users, Sparkles } from "lucide-react";

export function Landing() {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: '2-digit' 
  }).toLowerCase();

  return (
    <div className="min-h-screen bg-[var(--bg)] relative overflow-x-hidden text-[var(--text-primary)] font-serif">
      {/* 노트 룰드 라인 배경 */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'linear-gradient(to bottom, transparent 27px, rgba(0,0,0,0.08) 28px)',
          backgroundSize: '100% 28px'
        }}
      />
      
      {/* 상단 바 */}
      <header className="relative z-10 h-14 flex items-center justify-between px-8 border-b border-[var(--line)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-[28pt] italic font-serif leading-none">일기</h1>
            <div className="h-6 w-[2px] bg-[var(--accent)]" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-sm font-sans hover:text-[var(--accent)] transition-colors">로그인</Link>
          <Link to="/auth">
            <button className="border border-[var(--text-primary)] px-4 py-1.5 text-sm rounded-[2px] hover:bg-[var(--text-primary)] hover:text-white transition-colors">
              시작하기
            </button>
          </Link>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <main className="relative z-10 max-w-7xl mx-auto px-8 py-20 flex flex-col lg:flex-row items-center min-h-[calc(100vh-56px)]">
        <div className="flex-1 max-w-2xl pt-10 lg:pt-0">
          {/* 날짜 레이블 */}
          <div className="text-[11pt] text-[var(--text-muted)] font-mono mb-4">
            {formattedDate}
          </div>

          <h2 className="text-[32pt] md:text-[48pt] lg:text-[64pt] leading-[1.15] font-serif mb-6">
            오늘의 하루를<br />
            누군가에게.
          </h2>
          
          <p className="text-[16pt] text-[var(--text-muted)] max-w-[420px] mb-12 leading-relaxed">
            하루에 한 번, 당신의 일기가 익명의 누군가에게 전달됩니다. 그리고 마음이 돌아옵니다.
          </p>
          
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <Link to="/auth">
                <button className="bg-[var(--accent)] text-white px-8 py-3.5 rounded-[2px] hover:bg-[var(--accent)]/90 transition-colors">
                  무료로 시작하기
                </button>
              </Link>
              <button className="border border-[var(--accent)] text-[var(--accent)] px-8 py-3.5 rounded-[2px] hover:bg-[var(--accent)]/10 transition-colors">
                서비스 소개 보기
              </button>
            </div>
            <div className="mt-2 text-[10pt] font-mono">
              이미 계정이 있으신가요? <Link to="/auth" className="underline decoration-1 underline-offset-2">로그인</Link>
            </div>
          </div>
        </div>

        {/* 우측 데코 영역 */}
        <div className="flex-1 flex items-center justify-center mt-20 lg:mt-0 relative h-[500px] w-full">
          {/* 카드 3 (뒤) */}
          <div className="absolute w-[320px] h-[440px] bg-[var(--surface)] border border-[var(--line)] shadow-sm transform rotate-[4deg] opacity-60 translate-x-12 translate-y-4 rounded text-left p-6">
             <div className="space-y-6 mt-8">
               {[...Array(8)].map((_, i) => <div key={i} className="h-px bg-[var(--line)] w-full" />)}
             </div>
          </div>
          {/* 카드 2 (중간) */}
          <div className="absolute w-[320px] h-[440px] bg-[var(--surface)] border border-[var(--line)] shadow-sm transform rotate-0 opacity-80 translate-x-6 translate-y-2 rounded text-left p-6">
             <div className="space-y-6 mt-8">
               {[...Array(8)].map((_, i) => <div key={i} className="h-px bg-[var(--line)] w-full" />)}
             </div>
          </div>
          {/* 카드 1 (앞) */}
          <div className="absolute w-[320px] h-[440px] bg-[var(--surface)] border border-[var(--line)] shadow-sm transform rotate-[-6deg] rounded text-left p-8 z-10 flex flex-col">
            <div className="font-mono text-[10pt] text-[var(--text-muted)] mb-6 text-right">2026. 03. 02</div>
            <div className="flex-1 relative">
               <div className="font-serif text-[15pt] leading-loose text-[var(--text-primary)]">
                 오늘 날씨가 참 좋았다. 오랜만에 산책을 나갔는데...
               </div>
               <div className="absolute bottom-4 right-4 w-16 h-16 border-2 border-[var(--accent)] rounded-full opacity-80 flex items-center justify-center transform -rotate-12">
                 <span className="text-[var(--accent)] font-serif text-sm">Good</span>
               </div>
            </div>
             <div className="absolute inset-0 pointer-events-none p-8" style={{ background: 'repeating-linear-gradient(transparent, transparent 31px, var(--line) 31px, var(--line) 32px)' }}></div>
          </div>
        </div>
      </main>

      {/* 피처 섹션 */}
      <section className="border-t border-[var(--line)] bg-[var(--bg)] py-24">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--line)]">
          <div className="px-8 py-8 md:py-0 flex flex-col gap-4">
            <Mail className="w-8 h-8 stroke-[1.5]" />
            <h3 className="text-[18pt] font-serif">익명 교환</h3>
            <p className="text-[14pt] text-[var(--text-muted)] leading-relaxed">랜덤으로 누군가의 하루를 받습니다</p>
          </div>
          <div className="px-8 py-8 md:py-0 flex flex-col gap-4">
            <Users className="w-8 h-8 stroke-[1.5]" />
            <h3 className="text-[18pt] font-serif">그룹 일기</h3>
            <p className="text-[14pt] text-[var(--text-muted)] leading-relaxed">친구들과 함께, 매일 돌아가며</p>
          </div>
          <div className="px-8 py-8 md:py-0 flex flex-col gap-4">
            <Sparkles className="w-8 h-8 stroke-[1.5]" />
            <h3 className="text-[18pt] font-serif">AI 답장</h3>
            <p className="text-[14pt] text-[var(--text-muted)] leading-relaxed">혼자여도 괜찮아요, AI가 읽어드려요</p>
          </div>
        </div>
      </section>

      {/* 철학 섹션 */}
      <section className="bg-[var(--text-primary)] py-32 text-center">
        <h2 className="text-white text-[36pt] italic font-serif mb-4">좋아요도, 팔로우도 없습니다.</h2>
        <p className="text-white text-[18pt] font-serif opacity-90">핵심은 교환입니다.</p>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-[var(--line)] bg-[var(--bg)] py-8 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 font-mono text-[10pt]">
            <span className="font-serif italic">일기</span>
            <span className="text-[var(--text-muted)]">© 2026 Figma Make.</span>
          </div>
          <div className="flex gap-6 font-mono text-[10pt] text-[var(--text-muted)]">
            <Link to="#" className="hover:text-[var(--text-primary)]">이용약관</Link>
            <Link to="#" className="hover:text-[var(--text-primary)]">개인정보처리방침</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}