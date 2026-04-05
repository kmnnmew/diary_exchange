import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { User, Mail, Shield, Bell, ChevronRight, LogOut, Crown, Calendar, BookOpen, MessageSquare, Sparkles, Check, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useApp, useUnreadCount } from "../context/AppContext";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

type OpenPanel = 'profile' | 'account' | 'privacy' | 'notification' | null;

export function MyPage() {
  const { notifications, markAllRead, archiveEntries, nickname, setNickname } = useApp();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();

  const [showNotifications, setShowNotifications] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(nickname);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  // 그룹 수 Supabase에서 가져오기
  const [groupCount, setGroupCount] = useState(0);
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('group_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .then(({ count }) => setGroupCount(count ?? 0));
  }, [user?.id]);

  // 계정 설정 — 비밀번호 변경
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // 프로필 설정 — 한 줄 소개
  const [bio, setBio] = useState(() => profile?.bio ?? "");
  const [bioInput, setBioInput] = useState(bio);

  // profile이 비동기로 로드된 후 bio/nickname 동기화
  useEffect(() => {
    if (profile?.bio !== undefined) {
      setBio(profile.bio ?? "");
      setBioInput(profile.bio ?? "");
    }
  }, [profile?.bio]);

  useEffect(() => {
    if (profile?.nickname) {
      setNicknameInput(profile.nickname);
    }
  }, [profile?.nickname]);

  // 알림 설정
  const [notifDiary, setNotifDiary] = useState(() =>
    localStorage.getItem('notif_diary') !== 'false'
  );
  const [notifComment, setNotifComment] = useState(() =>
    localStorage.getItem('notif_comment') !== 'false'
  );
  const [notifGroup, setNotifGroup] = useState(() =>
    localStorage.getItem('notif_group') !== 'false'
  );

  const stats = [
    { label: '작성한 일기', value: String(archiveEntries.length), icon: BookOpen },
    { label: '받은 답장', value: String(archiveEntries.filter(e => e.status === 'completed').length), icon: MessageSquare },
    { label: '참여 그룹', value: String(groupCount), icon: Crown },
    { label: 'AI 교환', value: String(archiveEntries.filter(e => e.type === 'ai').length), icon: Sparkles },
  ];

  const handleNicknameSave = () => {
    if (nicknameInput.trim()) {
      setNickname(nicknameInput.trim());
      toast.success("닉네임이 변경되었습니다.");
    }
    setEditingNickname(false);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("로그아웃 되었습니다.");
    navigate('/');
  };

  const handleMarkAllRead = () => {
    markAllRead();
    toast.success("모든 알림을 읽음 처리했습니다.");
  };

  const handlePasswordChange = async () => {
    if (!newPw || !confirmPw) {
      toast.error("새 비밀번호를 입력해주세요.");
      return;
    }
    if (newPw.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);
    if (error) {
      toast.error("비밀번호 변경에 실패했습니다: " + error.message);
    } else {
      toast.success("비밀번호가 변경되었습니다.");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setOpenPanel(null);
    }
  };

  const handleBioSave = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ bio: bioInput.trim() })
      .eq('id', user!.id);
    if (error) {
      toast.error("소개 저장에 실패했습니다.");
    } else {
      setBio(bioInput.trim());
      toast.success("소개가 저장되었습니다.");
    }
  };

  const handleNotifToggle = (key: string, val: boolean) => {
    localStorage.setItem(key, String(val));
    if (key === 'notif_diary') setNotifDiary(val);
    if (key === 'notif_comment') setNotifComment(val);
    if (key === 'notif_group') setNotifGroup(val);
    toast.success("알림 설정이 저장되었습니다.");
  };

  const togglePanel = (panel: OpenPanel) =>
    setOpenPanel(prev => prev === panel ? null : panel);

  return (
    <div className="max-w-2xl mx-auto p-8 font-serif text-[var(--text-primary)]">
      {/* 헤더 */}
      <h1 className="text-[24pt] font-serif mb-8 h-[64px] flex items-center">마이페이지</h1>

      {/* 프로필 카드 */}
      <div className="bg-[var(--surface)] border border-[var(--line)] p-8 mb-6 flex items-center gap-6">
        <div className="w-16 h-16 bg-[var(--text-primary)] rounded-full flex items-center justify-center">
          <span className="text-[var(--bg)] text-[24pt] italic font-serif leading-none">일</span>
        </div>
        <div className="flex-1">
          {editingNickname ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                autoFocus
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNicknameSave(); if (e.key === 'Escape') setEditingNickname(false); }}
                className="text-[18pt] font-serif bg-transparent border-b border-[var(--accent)] outline-none w-full text-[var(--text-primary)]"
              />
              <button onClick={handleNicknameSave} className="text-[var(--secondary)] hover:opacity-80"><Check size={16} /></button>
              <button onClick={() => setEditingNickname(false)} className="text-[var(--text-muted)] hover:opacity-80"><X size={16} /></button>
            </div>
          ) : (
            <div className="text-[18pt] font-serif mb-1">{nickname}</div>
          )}
          {bio && <div className="text-[11pt] font-sans text-[var(--text-muted)] mb-1">{bio}</div>}
          <div className="text-[11pt] font-mono text-[var(--text-muted)]">{user?.email ?? ''}</div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-[var(--line)] rounded-full text-[9pt] font-mono text-[var(--text-muted)]">
            <Calendar className="w-3 h-3" />
            {profile?.created_at
              ? `${new Date(profile.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', timeZone: 'Asia/Seoul' })}부터 함께함`
              : '함께하는 중'}
          </div>
        </div>
        <button
          onClick={() => { setNicknameInput(nickname); setEditingNickname(true); }}
          className="px-4 py-2 border border-[var(--line)] text-[10pt] font-mono hover:border-[var(--accent)] transition-colors rounded-[2px]"
        >
          편집
        </button>
      </div>

      {/* 활동 통계 */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[var(--surface)] border border-[var(--line)] p-4 text-center">
              <Icon className="w-5 h-5 mx-auto mb-2 text-[var(--text-muted)] stroke-[1.5]" />
              <div className="text-[20pt] font-serif">{stat.value}</div>
              <div className="text-[8pt] font-mono text-[var(--text-muted)] mt-0.5">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* 알림 섹션 */}
      <div className="bg-[var(--surface)] border border-[var(--line)] mb-4 overflow-hidden">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="w-full flex items-center justify-between p-5 hover:bg-[var(--bg)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 stroke-[1.5] text-[var(--text-muted)]" />
            <span className="font-serif text-[13pt]">알림</span>
            {unreadCount > 0 && (
              <span className="bg-[var(--accent)] text-white text-[9pt] font-mono px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <ChevronRight className={`w-5 h-5 stroke-[1.5] text-[var(--text-muted)] transition-transform ${showNotifications ? 'rotate-90' : ''}`} />
        </button>

        {showNotifications && (
          <div className="border-t border-[var(--line)]">
            {unreadCount > 0 && (
              <div className="px-5 py-3 border-b border-dashed border-[var(--line)] flex justify-end">
                <button onClick={handleMarkAllRead} className="text-[9pt] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                  모두 읽음
                </button>
              </div>
            )}
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-[var(--text-muted)] font-serif text-[13pt] italic">알림이 없어요</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`flex items-start gap-4 px-5 py-4 border-b border-dashed border-[var(--line)] last:border-0 ${!n.read ? 'bg-[var(--accent)]/5' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.read ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`} />
                  <div className="flex-1">
                    <p className="font-serif text-[12pt] text-[var(--text-primary)]">{n.message}</p>
                    <p className="font-mono text-[9pt] text-[var(--text-muted)] mt-1">{n.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 메뉴 목록 */}
      <div className="bg-[var(--surface)] border border-[var(--line)] mb-4 overflow-hidden divide-y divide-[var(--line)]">

        {/* 프로필 설정 */}
        <button
          onClick={() => togglePanel('profile')}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg)] transition-colors group text-left"
        >
          <User className="w-5 h-5 stroke-[1.5] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
          <div className="flex-1">
            <div className="font-serif text-[13pt]">프로필 설정</div>
            <div className="font-mono text-[9pt] text-[var(--text-muted)]">닉네임, 소개 변경</div>
          </div>
          <ChevronRight className={`w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-all ${openPanel === 'profile' ? 'rotate-90' : ''}`} />
        </button>
        {openPanel === 'profile' && (
          <div className="px-5 py-5 bg-[var(--bg)] space-y-4 border-t border-dashed border-[var(--line)]">
            <div>
              <label className="block text-[9pt] font-mono text-[var(--text-muted)] mb-1 uppercase tracking-wider">닉네임</label>
              <div className="flex gap-2">
                <input
                  value={nicknameInput}
                  onChange={e => setNicknameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { handleNicknameSave(); setNicknameInput(nicknameInput); } }}
                  className="flex-1 border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-serif text-[12pt] outline-none focus:border-[var(--accent)] rounded-[2px]"
                />
                <button
                  onClick={handleNicknameSave}
                  className="px-4 py-2 bg-[var(--accent)] text-white text-[10pt] font-mono rounded-[2px] hover:opacity-90"
                >
                  저장
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[9pt] font-mono text-[var(--text-muted)] mb-1 uppercase tracking-wider">한 줄 소개</label>
              <div className="flex gap-2">
                <input
                  value={bioInput}
                  onChange={e => setBioInput(e.target.value)}
                  placeholder="나를 소개하는 한 마디..."
                  maxLength={50}
                  className="flex-1 border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-serif text-[12pt] outline-none focus:border-[var(--accent)] rounded-[2px] placeholder:text-[var(--text-muted)] placeholder:italic"
                />
                <button
                  onClick={handleBioSave}
                  className="px-4 py-2 bg-[var(--accent)] text-white text-[10pt] font-mono rounded-[2px] hover:opacity-90"
                >
                  저장
                </button>
              </div>
              <p className="text-[9pt] font-mono text-[var(--text-muted)] mt-1 text-right">{bioInput.length}/50</p>
            </div>
          </div>
        )}

        {/* 계정 설정 */}
        <button
          onClick={() => togglePanel('account')}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg)] transition-colors group text-left"
        >
          <Mail className="w-5 h-5 stroke-[1.5] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
          <div className="flex-1">
            <div className="font-serif text-[13pt]">계정 설정</div>
            <div className="font-mono text-[9pt] text-[var(--text-muted)]">이메일, 비밀번호 변경</div>
          </div>
          <ChevronRight className={`w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-all ${openPanel === 'account' ? 'rotate-90' : ''}`} />
        </button>
        {openPanel === 'account' && (
          <div className="px-5 py-5 bg-[var(--bg)] space-y-4 border-t border-dashed border-[var(--line)]">
            <div>
              <label className="block text-[9pt] font-mono text-[var(--text-muted)] mb-1 uppercase tracking-wider">이메일</label>
              <div className="px-3 py-2 border border-[var(--line)] bg-[var(--surface)] font-mono text-[11pt] text-[var(--text-muted)] rounded-[2px]">
                {user?.email}
              </div>
            </div>
            <div className="pt-2 border-t border-dashed border-[var(--line)]">
              <p className="text-[11pt] font-serif mb-3">비밀번호 변경</p>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="새 비밀번호 (6자 이상)"
                    className="w-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 pr-10 font-mono text-[11pt] outline-none focus:border-[var(--accent)] rounded-[2px] placeholder:text-[var(--text-muted)]"
                  />
                  <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="새 비밀번호 확인"
                  className="w-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-mono text-[11pt] outline-none focus:border-[var(--accent)] rounded-[2px] placeholder:text-[var(--text-muted)]"
                />
                <button
                  onClick={handlePasswordChange}
                  disabled={pwLoading || !newPw || !confirmPw}
                  className="w-full py-2 bg-[var(--accent)] text-white text-[10pt] font-mono rounded-[2px] hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {pwLoading ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 개인정보 및 보안 */}
        <button
          onClick={() => togglePanel('privacy')}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg)] transition-colors group text-left"
        >
          <Shield className="w-5 h-5 stroke-[1.5] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
          <div className="flex-1">
            <div className="font-serif text-[13pt]">개인정보 및 보안</div>
            <div className="font-mono text-[9pt] text-[var(--text-muted)]">차단 목록, 신고 내역</div>
          </div>
          <ChevronRight className={`w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-all ${openPanel === 'privacy' ? 'rotate-90' : ''}`} />
        </button>
        {openPanel === 'privacy' && (
          <div className="px-5 py-5 bg-[var(--bg)] space-y-3 border-t border-dashed border-[var(--line)]">
            <PrivacyBlockList userId={user?.id ?? ''} />
          </div>
        )}

        {/* 알림 설정 */}
        <button
          onClick={() => togglePanel('notification')}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg)] transition-colors group text-left"
        >
          <Bell className="w-5 h-5 stroke-[1.5] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
          <div className="flex-1">
            <div className="font-serif text-[13pt]">알림 설정</div>
            <div className="font-mono text-[9pt] text-[var(--text-muted)]">알림 방식 설정</div>
          </div>
          <ChevronRight className={`w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-all ${openPanel === 'notification' ? 'rotate-90' : ''}`} />
        </button>
        {openPanel === 'notification' && (
          <div className="px-5 py-5 bg-[var(--bg)] space-y-3 border-t border-dashed border-[var(--line)]">
            {[
              { key: 'notif_diary', label: '일기 수신 알림', desc: '누군가 내 일기에 답장을 보냈을 때', value: notifDiary },
              { key: 'notif_comment', label: '코멘트 알림', desc: '내 일기에 코멘트가 달렸을 때', value: notifComment },
              { key: 'notif_group', label: '그룹 일기 알림', desc: '그룹 멤버가 일기를 작성했을 때', value: notifGroup },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-serif text-[12pt]">{item.label}</p>
                  <p className="font-mono text-[9pt] text-[var(--text-muted)]">{item.desc}</p>
                </div>
                <button
                  onClick={() => handleNotifToggle(item.key, !item.value)}
                  className={`w-11 h-6 rounded-full transition-colors relative overflow-hidden flex-shrink-0 ${item.value ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`}
                >
                  <span
                    className="absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200"
                    style={{ left: item.value ? '22px' : '2px' }}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 프리미엄 배너 */}
      <div className="border border-[var(--accent)] bg-[var(--accent)]/5 p-5 mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-4 h-4 text-[var(--accent)]" />
            <span className="font-serif text-[13pt]">프리미엄 플랜</span>
          </div>
          <p className="text-[10pt] text-[var(--text-muted)] font-mono">AI 커스터마이징 · 프리미엄 디자인 · 무제한 스탬프</p>
        </div>
        <button className="px-5 py-2 bg-[var(--accent)] text-white text-[10pt] rounded-[2px] hover:opacity-90 transition-opacity shrink-0">
          구독하기
        </button>
      </div>

      {/* 로그아웃 */}
      <div className="border border-[var(--line)] overflow-hidden">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[var(--destructive)]/5 transition-colors text-[var(--destructive)]"
        >
          <LogOut className="w-5 h-5 stroke-[1.5]" />
          <span className="font-serif text-[13pt]">로그아웃</span>
        </button>
      </div>

      {/* 푸터 링크 */}
      <div className="flex justify-center gap-6 mt-8 text-[9pt] font-mono text-[var(--text-muted)]">
        <Link to="#" className="hover:text-[var(--text-primary)] transition-colors">이용약관</Link>
        <Link to="#" className="hover:text-[var(--text-primary)] transition-colors">개인정보처리방침</Link>
        <span>v1.0.0</span>
      </div>
    </div>
  );
}

// ── 차단 목록 서브 컴포넌트 ────────────────────────────────────────────────
function PrivacyBlockList({ userId }: { userId: string }) {
  const [blocks, setBlocks] = useState<Array<{ id: string; nickname: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('blocked_users')
      .select('blocked_id, profiles!blocked_id(nickname)')
      .eq('blocker_id', userId)
      .then(({ data }) => {
        setBlocks((data ?? []).map((b: any) => ({
          id: b.blocked_id,
          nickname: b.profiles?.nickname ?? '알 수 없음',
        })));
        setLoading(false);
      });
  }, [userId]);

  const handleUnblock = async (blockedId: string) => {
    await supabase.from('blocked_users').delete().eq('blocker_id', userId).eq('blocked_id', blockedId);
    setBlocks(prev => prev.filter(b => b.id !== blockedId));
    toast.success("차단이 해제되었습니다.");
  };

  if (loading) return <p className="text-[10pt] font-mono text-[var(--text-muted)]">불러오는 중...</p>;
  if (blocks.length === 0) return <p className="text-[11pt] font-serif text-[var(--text-muted)] italic">차단한 사용자가 없어요.</p>;

  return (
    <div className="space-y-2">
      <p className="text-[9pt] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2">차단 목록</p>
      {blocks.map(b => (
        <div key={b.id} className="flex items-center justify-between py-2 border-b border-dashed border-[var(--line)] last:border-0">
          <span className="font-serif text-[12pt]">{b.nickname}</span>
          <button
            onClick={() => handleUnblock(b.id)}
            className="text-[9pt] font-mono text-[var(--destructive)] hover:underline"
          >
            차단 해제
          </button>
        </div>
      ))}
    </div>
  );
}
