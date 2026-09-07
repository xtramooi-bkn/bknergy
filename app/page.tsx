import type { ReactNode } from "react";

function Energy({ className = "" }: { className?: string }) {
  return <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m13 2-8 12h6l-1 8 9-13h-7z" /></svg>;
}
function Metric({ label, value, unit, note, icon }: { label: string; value: string; unit?: string; note: string; icon: ReactNode }) {
  return <article className="rounded-2xl border border-emerald-950/8 bg-white p-6"><span className="mb-5 flex size-10 items-center justify-center rounded-xl bg-[#eff6ef] text-emerald-800">{icon}</span><h3 className="text-sm text-slate-500">{label}</h3><p className="mt-2 flex flex-wrap items-baseline gap-2"><span className="text-3xl font-semibold tracking-tight">{value}</span><span className="text-sm text-slate-500">{unit}</span></p><p className="mt-4 text-xs text-slate-500">{note}</p></article>;
}
function LineIcon({ children }: { children: ReactNode }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-emerald-950/8 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-10">
          <a href="#dashboard" aria-label="BKNergy dashboard" className="flex items-center gap-2.5 text-2xl font-bold tracking-tight"><span className="flex size-9 items-center justify-center rounded-xl bg-[#143f35] text-[#c7f58a]"><Energy /></span>BKNergy<span className="mb-3 size-1.5 rounded-full bg-emerald-500" /></a>
          <div className="flex items-center gap-4"><span className="hidden text-sm text-slate-500 sm:block">Your wellness, rewarded.</span><span className="flex size-10 items-center justify-center rounded-full border border-emerald-900/10 bg-[#edf2e9] text-sm font-semibold" aria-label="Johan's profile">J</span></div>
        </div>
      </header>
      <main id="dashboard" className="mx-auto max-w-7xl px-5 py-9 sm:px-10 sm:py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 text-xs font-semibold tracking-[0.18em] text-emerald-700 uppercase">Your wellness dashboard</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Looking good, Johan<span className="text-emerald-600">.</span></h1><p className="mt-3 text-sm text-slate-500 sm:text-base">A healthier you. A little more rewarded, every day.</p></div>
          <span className="rounded-full border border-emerald-900/10 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">Demo · Mock data</span>
        </div>
        <section aria-labelledby="balance-title" className="relative overflow-hidden rounded-3xl bg-[#143f35] p-7 text-white sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-28 size-96 rounded-full border-[55px] border-white/5" />
          <div className="relative flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
            <div><h2 id="balance-title" className="flex items-center gap-2 text-sm font-medium text-emerald-100/80"><Energy />Your reward balance</h2><p className="mt-5 flex items-baseline gap-3"><span className="text-5xl font-semibold tracking-tight sm:text-6xl">1,188</span><span className="text-xl font-medium text-[#c7f58a]">BKNE</span></p><p className="mt-4 text-sm text-emerald-100/80">Good energy. Real rewards.</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-5 sm:min-w-60"><span className="mb-3 flex size-9 items-center justify-center rounded-full bg-[#c7f58a] text-[#143f35]" aria-hidden="true">↗</span><p className="text-2xl font-semibold">+284 <span className="text-sm font-normal text-emerald-100/80">BKNE this week</span></p><p className="mt-2 text-xs text-emerald-100/80">Your movement is making a difference.</p></div>
          </div>
        </section>
        <section aria-labelledby="week-title" className="mt-10">
          <div className="mb-5 flex items-center justify-between"><h2 id="week-title" className="text-lg font-semibold tracking-tight">Your week in motion</h2><span className="text-xs text-slate-500">This week</span></div>
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
            <Metric label="Weekly distance" value="24.8" unit="km" note="Every kilometre counts" icon={<LineIcon><path d="m4 17 5-11 6 12 5-11" /><circle cx="4" cy="17" r="2" /><circle cx="20" cy="7" r="2" /></LineIcon>} />
            <Metric label="Active minutes" value="187" unit="min" note="Time invested in you" icon={<LineIcon><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6M12 2v3" /></LineIcon>} />
            <Metric label="Steps" value="63,420" note="Small steps. Real progress." icon={<LineIcon><path d="M8 3c3 0 3 7 1 9-2 2-5 0-5-3s1-6 4-6ZM17 10c3 0 4 3 3 6s-4 4-5 1c-1-2-1-7 2-7ZM5 16l3 1-1 4-3-1ZM15 21l3 1" /></LineIcon>} />
            <Metric label="BKNE earned" value="284" unit="BKNE" note="Earned this week" icon={<Energy />} />
          </div>
        </section>
        <section aria-labelledby="activity-title" className="mt-10">
          <h2 id="activity-title" className="mb-5 text-lg font-semibold tracking-tight">Recent activity</h2>
          <article className="overflow-hidden rounded-2xl border border-emerald-950/8 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-950/8 p-6">
              <div className="flex items-center gap-4"><span className="flex size-12 items-center justify-center rounded-2xl bg-[#edf4e7] text-emerald-800"><LineIcon><circle cx="15" cy="4" r="2" /><path d="m12 8 4 4 4 1M5 10l5-3 3 3-3 5 5 3v4M10 15l-4 6H2" /></LineIcon></span><div><h3 className="font-semibold">Morning Run</h3><p className="mt-1 text-xs text-slate-500">Outdoor running</p></div></div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"><span aria-hidden="true">✓ </span>Verified</span>
            </div>
            <dl className="grid grid-cols-2 gap-7 p-6 sm:grid-cols-4 sm:gap-4 sm:py-8">
              <div><dt className="text-xs text-slate-500">Distance</dt><dd className="mt-2 text-2xl font-semibold tracking-tight">5.24 <span className="text-sm font-normal text-slate-500">km</span></dd></div>
              <div><dt className="text-xs text-slate-500">Duration</dt><dd className="mt-2 text-2xl font-semibold tracking-tight">31:42</dd></div>
              <div><dt className="text-xs text-slate-500">Average heart rate</dt><dd className="mt-2 text-2xl font-semibold tracking-tight">154 <span className="text-sm font-normal text-slate-500">bpm</span></dd></div>
              <div><dt className="text-xs text-slate-500">Reward earned</dt><dd className="mt-2 text-2xl font-semibold tracking-tight text-emerald-700">+52 <span className="text-sm font-medium">BKNE</span></dd></div>
            </dl>
            <div className="flex items-center gap-2 bg-[#f8faf6] px-6 py-3.5 text-xs text-slate-500"><span className="text-emerald-700" aria-hidden="true">✓</span>Verified activity. Every effort counts.</div>
          </article>
        </section>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-950/8 pt-6 text-xs text-slate-500"><p>BKNergy · Move well. Live well. Earn energy.</p><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-emerald-500" />Built around your wellbeing</span></footer>
      </main>
    </div>
  );
}
