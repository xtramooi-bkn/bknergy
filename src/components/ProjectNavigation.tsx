"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./ui/Brand";
import Icon, { type IconName } from "./ui/Icon";
import { useEffect, useRef } from "react";

export default function ProjectNavigation({ localAdmin }: { localAdmin: boolean }) {
  const pathname = usePathname();
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !panel.current?.contains(event.target) && panel.current) panel.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && panel.current?.open) {
        panel.current.open = false;
        panel.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const participants = [["Dashboard", "/"], ["Activities", "/activities"], ["Challenges", "/challenges"], ["Rewards", "/rewards"], ...(localAdmin ? [["My campaigns", "/#my-campaigns"]] : [])];
  const admin = [["Campaigns", "/admin/campaigns"], ["Add campaign", "/admin/campaigns/new"], ["Reward distribution", "/admin/rewards"], ["Brickken deployment", "/admin/brickken/deploy"], ["Mint BKNE", "/admin/brickken/mint"]];
  const icons: Record<string, IconName> = { Dashboard: "dashboard", Activities: "run", Challenges: "campaign", Rewards: "reward", "My campaigns": "people", Campaigns: "campaign", "Add campaign": "plus", "Reward distribution": "reward", "Brickken deployment": "blockchain", "Mint BKNE": "blockchain" };
  function links(items: string[][]) {
    return items.map(([label, href]) => <Link key={href} href={href} prefetch={false} onClick={() => { if (panel.current) panel.current.open = false; }} className="project-link rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"><Icon name={icons[label]} className="size-4"/><span>{label}{(label === "Brickken deployment" || label === "Mint BKNE") && <span className="mt-0.5 block text-[10px] text-slate-500">Development / local only</span>}</span></Link>);
  }
  return <div className="project-bar">
    <div className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-2 sm:px-8 lg:px-12">
      <div>{pathname !== "/" && <Link href="/" className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-800"><BrandMark className="size-7"/>BKNergy</Link>}</div>
      <details ref={panel} className="relative z-40">
        <summary className="project-toggle cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-700"><Icon name="admin" className="size-3.5"/>Project navigation<Icon name="chevron" className="size-3.5"/></summary>
        <nav aria-label="Project navigation" className="project-panel absolute right-0 top-full mt-2 max-h-[75dvh] w-64 max-w-[calc(100vw-2.5rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Participant</p>
          {links(participants)}
          {localAdmin && <div className="mt-2 border-t border-slate-100 pt-2"><p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-teal-700">Admin tools · Local development</p>{links(admin)}</div>}
        </nav>
      </details>
    </div>
  </div>;
}
