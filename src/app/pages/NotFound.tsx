import { Link } from "react-router";
import { Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-serif">
      <div className="text-center">
        <h1 className="text-[64pt] mb-4 italic text-[var(--text-primary)]">
          404
        </h1>
        <p className="text-[20pt] text-[var(--text-muted)] italic mb-8">
          페이지를 찾을 수 없어요
        </p>
        <Link to="/">
          <button className="flex items-center gap-2 mx-auto px-6 py-3 border border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors rounded-[2px]">
            <Home className="w-4 h-4" />
            <span>홈으로 돌아가기</span>
          </button>
        </Link>
      </div>
    </div>
  );
}