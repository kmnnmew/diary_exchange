import { Outlet, Link, useLocation } from "react-router";
import { House, Mail, Users, Sparkles, Book, Palette, User } from "lucide-react";
import { useUnreadCount } from "../context/AppContext";

export function MainLayout() {
  const location = useLocation();
  const unreadCount = useUnreadCount();

  const navItems = [
    { path: '/app', icon: House, label: '홈', exact: true },
    { path: '/app/write', icon: Mail, label: '익명 일기', exact: false },
    { path: '/app/group', icon: Users, label: '그룹 일기', exact: false },
    { path: '/app/ai', icon: Sparkles, label: 'AI 일기', exact: false },
    { path: '/app/archive', icon: Book, label: '기록 보관함', exact: false },
  ];

  const isActive = (path: string, exact: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      {/* 사이드바 */}
      <aside className="w-[64px] bg-[var(--sidebar)] flex flex-col items-center fixed h-full z-50">
        {/* 로고 */}
        <Link to="/app" className="h-[64px] flex items-center justify-center w-full hover:opacity-80 transition-opacity">
          <span className="text-white text-[24pt] italic font-serif leading-none">일</span>
        </Link>

        <div className="w-full h-px bg-white/15 mb-3" />

        {/* 네비게이션 */}
        <nav className="flex flex-col w-full">
          {navItems.map((item) => {
            const active = isActive(item.path, item.exact);
            const Icon = item.icon;
            const showBadge = item.path === '/app' && unreadCount > 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative w-[64px] h-[64px] flex items-center justify-center group"
                title={item.label}
              >
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent)]" />
                )}
                <div className="relative">
                  <Icon
                    className={`w-[22px] h-[22px] stroke-[1.5] transition-colors ${
                      active ? 'text-white' : 'text-white/50 group-hover:text-white'
                    }`}
                  />
                  {showBadge && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--accent)] rounded-full border border-[var(--text-primary)]" />
                  )}
                </div>
                {/* 툴팁 */}
                <div className="absolute left-full ml-3 px-2 py-1 bg-[var(--sidebar)] border border-white/10 text-white text-[9pt] font-mono whitespace-nowrap rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* 하단 아이콘 */}
        <div className="mt-auto w-full flex flex-col items-center pb-4">
          <div className="w-full h-px bg-white/15 mb-3" />
          <Link
            to="/app/customize"
            className="relative w-[64px] h-[64px] flex items-center justify-center group"
            title="꾸미기"
          >
            {location.pathname === '/app/customize' && (
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent)]" />
            )}
            <Palette className={`w-[22px] h-[22px] stroke-[1.5] transition-colors ${
              location.pathname === '/app/customize' ? 'text-white' : 'text-white/50 group-hover:text-white'
            }`} />
            <div className="absolute left-full ml-3 px-2 py-1 bg-[var(--sidebar)] border border-white/10 text-white text-[9pt] font-mono whitespace-nowrap rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              꾸미기
            </div>
          </Link>
          <Link
            to="/app/mypage"
            className="relative w-[64px] h-[64px] flex items-center justify-center group"
            title="마이페이지"
          >
            {location.pathname === '/app/mypage' && (
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent)]" />
            )}
            <div className="relative">
              <User className={`w-[22px] h-[22px] stroke-[1.5] transition-colors ${
                location.pathname === '/app/mypage' ? 'text-white' : 'text-white/50 group-hover:text-white'
              }`} />
              {unreadCount > 0 && location.pathname !== '/app/mypage' && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--accent)] rounded-full border border-[var(--text-primary)]" />
              )}
            </div>
            <div className="absolute left-full ml-3 px-2 py-1 bg-[var(--sidebar)] border border-white/10 text-white text-[9pt] font-mono whitespace-nowrap rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              마이페이지
            </div>
          </Link>
        </div>
      </aside>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 ml-[64px] bg-[var(--bg)] min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
