"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function ProjectNavigation({ localAdmin }: { localAdmin: boolean }) {
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
  const admin = [["Campaigns", "/admin/campaigns"], ["Add campaign", "/admin/campaigns/new"], ["Reward distribution", "/admin/rewards"], ["Brickken deployment", "/admin/brickken/deploy"]];
  function links(items: string[][]) {
    return items.map(([label, href]) => <Link key={href} href={href} prefetch={false} onClick={() => { if (panel.current) panel.current.open = false; }} className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700">{label}{label === "Brickken deployment" && <span className="mt-0.5 block text-[10px] text-slate-500">Development / local only</span>}</Link>);
  }
  return <div className="border-b border-slate-100 bg-white">
    <div className="mx-auto flex max-w-[1320px] justify-end px-5 py-2 sm:px-8 lg:px-12">
      <details ref={panel} className="relative z-40">
        <summary className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-teal-700">Project navigation</summary>
        <nav aria-label="Project navigation" className="absolute right-0 top-full mt-2 max-h-[75dvh] w-64 max-w-[calc(100vw-2.5rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Participant</p>
          {links(participants)}
          {localAdmin && <div className="mt-2 border-t border-slate-100 pt-2"><p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-teal-700">Admin tools · Local development</p>{links(admin)}</div>}
        </nav>
      </details>
    </div>
  </div>;
}
