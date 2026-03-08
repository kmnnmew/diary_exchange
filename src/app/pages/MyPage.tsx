import { useState } from "react";
import { Link } from "react-router";
import { User, Mail, Shield, Bell, ChevronRight, LogOut, Crown, Calendar, BookOpen, MessageSquare, Sparkles, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useApp, useUnreadCount } from "../context/AppContext";

export function MyPage() {
  const { notifications, markAllRead, archiveEntries, nickname, setNickname } = useApp();
  const unreadCount = useUnreadCount();
  const [showNotifications, setShowNotifications] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(nickname);

  const groupCount = (() => {
    try { return JSON.parse(localStorage.getItem('myGroups') || '[]').length; } catch { return 0; }
  })();

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

  const handleLogout = () => {
    toast.success("로그아웃 되었습니다.");
  };

  const handleMarkAllRead = () => {
    markAllRead();
    toast.success("모든 알림을 읽음 처리했습니다.");
  };

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
          <div className="text-[11pt] font-mono text-[var(--text-muted)]">user@example.com</div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-[var(--line)] rounded-full text-[9pt] font-mono text-[var(--text-muted)]">
            <Calendar className="w-3 h-3" />
            2026년 1월부터 함께함
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
                <button
                  onClick={handleMarkAllRead}
                  className="text-[9pt] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                >
                  모두 읽음
                </button>
              </div>
            )}
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-[var(--text-muted)] font-serif text-[13pt] italic">
                알림이 없어요
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 border-b border-dashed border-[var(--line)] last:border-0 ${!n.read ? 'bg-[var(--accent)]/5' : ''}`}
                >
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
        {[
          { icon: User, label: '프로필 설정', desc: '닉네임, 소개 변경' },
          { icon: Mail, label: '계정 설정', desc: '이메일, 비밀번호 변경' },
          { icon: Shield, label: '개인정보 및 보안', desc: '차단 목록, 신고 내역' },
          { icon: Bell, label: '알림 설정', desc: '알림 방식 설정' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg)] transition-colors group text-left"
            >
              <Icon className="w-5 h-5 stroke-[1.5] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
              <div className="flex-1">
                <div className="font-serif text-[13pt]">{item.label}</div>
                <div className="font-mono text-[9pt] text-[var(--text-muted)]">{item.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
            </button>
          );
        })}
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
