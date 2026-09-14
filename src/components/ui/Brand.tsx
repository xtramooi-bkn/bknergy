import type { ReactNode } from "react";
import Icon from "./Icon";

export function BrandMark({ className = "size-10" }: { className?: string }) {
  return <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true"><rect width="40" height="40" rx="12" fill="#102f40"/><path d="M10 10h14l6 7-8 3H9l4-4h10l-2-2H9Z" fill="#54dbc2"/><path d="M9 22h14l7 7-8 3H9l4-4h10l-2-2H7Z" fill="#fff"/><path d="m29 8 5 5-5 5" stroke="#54dbc2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
export function BrandLogo() {
  return <span className="brand-lockup"><BrandMark/><span className="brand-wordmark">BK<span>Nergy</span><span className="brand-dot">.</span></span></span>;
}
export function RewardBadge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`bkne-badge ${className}`}><Icon name="reward" className="size-5 shrink-0"/><span>{children}</span></span>;
}

