import type { ReactNode } from "react";

const paths = {
  run: <><circle cx="15" cy="4" r="2"/><path d="m4 11 6-3 4 3 5 2M12 10l-3 5 5 3v4M9 15l-4 6H2"/></>,
  walk: <><circle cx="13" cy="4" r="2"/><path d="m7 11 4-3 3 4 4 1M11 8l-1 8-4 6M10 16l5 6"/></>,
  cycle: <><circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 5-8 5 8H5m10 0 3-11h-4M8 9h5"/></>,
  workout: <><path d="m7 7 10 10M3 6l3-3M18 21l3-3M3 10l7-7M14 21l7-7"/></>,
  distance: <><circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M8 6h7a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h4"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  steps: <><path d="M8 3c3 0 3 7 1 9-2 2-5 0-5-3s1-6 4-6ZM17 10c3 0 4 3 3 6s-4 4-5 1c-1-2-1-7 2-7ZM5 16l3 1-1 4-3-1ZM15 21l3 1"/></>,
  heart: <path d="M20 13 12 21 4 13C-3 6 7-1 12 6c5-7 15 0 8 7ZM3 12h5l2-4 3 8 2-4h6"/>,
  gps: <><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></>,
  device: <><rect x="7" y="6" width="10" height="12" rx="3"/><path d="M9 2h6l1 4M9 22h6l1-4M10 12h4"/></>,
  campaign: <><path d="M5 22V3m0 1c5-5 9 5 15 0v11c-6 5-10-5-15 0"/></>,
  people: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-2-4"/></>,
  reward: <><path d="m12 2 8 4v12l-8 4-8-4V6Z"/><path d="m13 6-5 7h4l-1 5 5-7h-4Z"/></>,
  wallet: <><path d="M20 8V5H5a2 2 0 0 0 0 4h16v11H5a2 2 0 0 1-2-2V7"/><path d="M21 12h-6v5h6M17 14.5h.1"/></>,
  gift: <><path d="M3 10h18v4H3zm2 4v8h14v-8M12 10v12"/><path d="M12 10C2 9 5 1 9 4c2 1 3 6 3 6Zm0 0c10-1 7-9 3-6-2 1-3 6-3 6Z"/></>,
  sponsor: <><path d="M4 22V4l10-2v20M14 9h6v13M2 22h20M8 7h2M8 12h2M8 17h2M17 13v2"/></>,
  admin: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M17 14v7m-3-3.5h7"/></>,
  blockchain: <><path d="m8 9 6-4a4 4 0 0 1 5 6l-3 2M16 15l-6 4a4 4 0 0 1-5-6l3-2M8 15l8-6"/></>,
  verified: <><path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5Z"/><path d="m8 12 3 3 5-6"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  pending: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
  failed: <><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></>,
  dashboard: <><rect x="3" y="3" width="7" height="18" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  chevron: <path d="m6 9 6 6 6-6"/>,
  plus: <path d="M12 4v16M4 12h16"/>,
  pulse: <path d="M2 12h5l3-8 4 16 3-8h5"/>,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></>,
  store: <><path d="m3 9 2-6h14l2 6M3 9v3c2 2 4 0 4 0s2 2 5 0c3 2 5 0 5 0s2 2 4 0V9M5 13v8h14v-8M10 21v-6h4v6"/></>,
} satisfies Record<string, ReactNode>;
export type IconName = keyof typeof paths;
export default function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

