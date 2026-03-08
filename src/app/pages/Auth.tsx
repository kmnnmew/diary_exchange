import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import { signUp, signIn } from "../../lib/auth";

function getKoreanError(message: string): string {
  if (message.includes('User already registered') || message.includes('already been registered'))
    return '이미 가입된 이메일입니다.';
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials'))
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (message.includes('Email not confirmed'))
    return '이메일 인증 후 로그인해주세요.';
  if (message.includes('Password should be at least') || message.includes('password'))
    return '비밀번호는 6자 이상이어야 합니다.';
  if (message.includes('Unable to validate email'))
    return '유효하지 않은 이메일입니다.';
  return '오류가 발생했습니다. 다시 시도해주세요.';
}

export function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Signup terms
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Async state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!isLogin) {
      if (password !== passwordConfirm) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
      if (!termsAccepted || !privacyAccepted) {
        setError('서비스 이용약관과 개인정보 처리방침에 동의해주세요.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, nicknameInput.trim() || '익명의 독자');
      }
      navigate('/app');
    } catch (err: any) {
      setError(getKoreanError(err?.message ?? '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setNicknameInput("");
    setTermsAccepted(false);
    setPrivacyAccepted(false);
    setError(null);
  };

  return (
    <div className="min-h-screen flex font-serif">
      {/* 좌측: --text-primary 배경 */}
      <div
        className="hidden lg:flex w-[42%] bg-[var(--text-primary)] relative items-center justify-center text-white"
      >
        <div className="absolute top-12 left-12">
           <h1 className="text-[28pt] italic font-serif leading-none">일기</h1>
        </div>

        <div className="z-10 text-center">
          <p className="text-[36pt] italic leading-tight">
            "오늘도<br />잘 왔어요."
          </p>
        </div>

        {/* 룰드 라인 텍스처 오버레이 (opacity 5%) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, white 31px, white 32px)',
          }}
        />
      </div>

      {/* 우측: --surface 배경 */}
      <div className="flex-1 bg-[var(--surface)] flex items-center justify-center px-8 py-12 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          {/* 모바일 로고 */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-[28pt] italic font-serif leading-none text-[var(--text-primary)]">일기</h1>
          </div>

          <div className="mb-12">
            <h2 className="text-[28pt] font-serif mb-4 text-[var(--text-primary)]">
              {isLogin ? '로그인' : '회원가입'}
            </h2>
            <button
              onClick={toggleMode}
              className="text-[11pt] font-mono text-[var(--accent)] hover:underline underline-offset-4"
            >
              {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {!isLogin && (
              <div>
                <label className="block text-[10pt] font-mono text-[var(--text-muted)] mb-1">nickname</label>
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  className="w-full h-11 bg-transparent border-b border-[var(--line)] focus:border-[var(--accent)] outline-none transition-colors text-[var(--text-primary)] font-serif"
                />
              </div>
            )}

            <div>
              <label className="block text-[10pt] font-mono text-[var(--text-muted)] mb-1">email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 bg-transparent border-b border-[var(--line)] focus:border-[var(--accent)] outline-none transition-colors text-[var(--text-primary)] font-serif"
              />
            </div>

            <div className="relative">
              <label className="block text-[10pt] font-mono text-[var(--text-muted)] mb-1">password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-11 bg-transparent border-b border-[var(--line)] focus:border-[var(--accent)] outline-none transition-colors text-[var(--text-primary)] font-serif pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 bottom-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
              </button>
            </div>

            {!isLogin && (
               <div className="relative">
                <label className="block text-[10pt] font-mono text-[var(--text-muted)] mb-1">confirm password</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  className="w-full h-11 bg-transparent border-b border-[var(--line)] focus:border-[var(--accent)] outline-none transition-colors text-[var(--text-primary)] font-serif"
                />
              </div>
            )}

            {isLogin && (
              <div className="text-right">
                <button type="button" className="text-[10pt] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  비밀번호를 잊으셨나요?
                </button>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-[13pt] font-serif text-[var(--text-primary)]">서비스 이용약관 (필수)</span>
                  <div className="flex items-center gap-3">
                    <button type="button" className="text-[10pt] font-mono text-[var(--text-muted)] underline">보기</button>
                    <button
                      type="button"
                      onClick={() => setTermsAccepted(!termsAccepted)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${termsAccepted ? 'bg-[var(--secondary)]' : 'bg-[var(--line)]'}`}
                    >
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${termsAccepted ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-[13pt] font-serif text-[var(--text-primary)]">개인정보 처리방침 (필수)</span>
                  <div className="flex items-center gap-3">
                    <button type="button" className="text-[10pt] font-mono text-[var(--text-muted)] underline">보기</button>
                    <button
                      type="button"
                      onClick={() => setPrivacyAccepted(!privacyAccepted)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${privacyAccepted ? 'bg-[var(--secondary)]' : 'bg-[var(--line)]'}`}
                    >
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${privacyAccepted ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <p className="text-[10pt] font-mono text-red-500 text-center -mt-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[var(--accent)] text-white text-[11pt] font-sans hover:bg-[var(--accent)]/90 transition-opacity rounded-[2px] disabled:opacity-60"
            >
              {loading ? '처리 중...' : isLogin ? '로그인' : '가입하기'}
            </button>

            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-[var(--line)]" />
              <span className="text-[10pt] font-mono text-[var(--text-muted)]">— 또는 —</span>
              <div className="flex-1 h-px bg-[var(--line)]" />
            </div>

            <div className="flex flex-col gap-3">
              <button type="button" disabled className="w-full h-11 border border-[var(--line)] text-[var(--text-muted)] rounded-[2px] flex items-center justify-center gap-2 opacity-40 cursor-not-allowed">
                Google 로그인 (준비 중)
              </button>
              <button type="button" disabled className="w-full h-11 border border-[var(--line)] text-[var(--text-muted)] rounded-[2px] flex items-center justify-center gap-2 opacity-40 cursor-not-allowed">
                Apple 로그인 (준비 중)
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
