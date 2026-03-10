import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { joinGroupByInviteCode } from "../../lib/groups";

export function JoinGroup() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Attempt join on mount (handles public/link-only groups automatically)
  useEffect(() => {
    if (!user || !inviteCode) return;

    async function tryJoin() {
      setLoading(true);
      const result = await joinGroupByInviteCode(inviteCode!, user!.id);
      if (result.success) {
        toast.success("그룹에 참여했습니다!");
        navigate("/app/group");
        return;
      }
      // Password required
      if (result.error === '비밀번호가 필요합니다.') {
        setNeedsPassword(true);
        setLoading(false);
        return;
      }
      // All other errors (invalid code, already a member, full, etc.)
      toast.error(result.error || "참여에 실패했습니다.");
      navigate("/app/group");
    }

    tryJoin();
  }, [user?.id, inviteCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePasswordSubmit = async () => {
    if (!user || !inviteCode || !password) return;
    setLoading(true);
    const result = await joinGroupByInviteCode(inviteCode, user.id, password);
    setLoading(false);
    if (result.success) {
      toast.success("그룹에 참여했습니다!");
      navigate("/app/group");
    } else {
      toast.error(result.error || "참여에 실패했습니다.");
    }
  };

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center font-serif text-[var(--text-primary)] bg-[var(--bg)]">
        <div className="text-center">
          <p className="text-[16pt] mb-6">로그인이 필요합니다.</p>
          <button
            onClick={() => navigate("/auth")}
            className="px-6 py-2.5 bg-[var(--accent)] text-white rounded-[2px] font-mono text-[11pt] hover:opacity-90 transition-opacity"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  // Loading / processing join
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-serif text-[var(--text-primary)] bg-[var(--bg)]">
        <p className="text-[16pt] text-[var(--text-muted)] italic">그룹에 참여하는 중...</p>
      </div>
    );
  }

  // Password prompt
  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center font-serif text-[var(--text-primary)] bg-[var(--bg)]">
        <div className="w-[380px] border border-[var(--line)] p-8 rounded-[4px] bg-[var(--surface)]">
          <h2 className="text-[18pt] font-serif mb-2">비공개 그룹</h2>
          <p className="text-[11pt] text-[var(--text-muted)] font-mono mb-6">
            이 그룹에 참여하려면 비밀번호가 필요합니다.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            placeholder="그룹 비밀번호"
            className="w-full border border-[var(--line)] p-3 outline-none font-mono text-[12pt] rounded-[2px] bg-transparent mb-4 focus:border-[var(--accent)] transition-colors"
          />
          <div className="flex gap-3">
            <button
              onClick={handlePasswordSubmit}
              disabled={!password}
              className="flex-1 py-3 bg-[var(--accent)] text-white rounded-[2px] font-mono text-[11pt] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              참여하기
            </button>
            <button
              onClick={() => navigate("/app/group")}
              className="px-5 py-3 border border-[var(--line)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors rounded-[2px] font-mono text-[11pt]"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
