"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-5xl px-5 py-10"><div role="alert" className="panel p-6"><h1 className="text-xl font-semibold">Activities could not be loaded</h1><p className="mt-3 text-sm text-slate-500">Please try again. If this continues, check the Supabase connection and activity read permissions.</p><div className="mt-5 flex gap-4"><button onClick={reset} className="rounded-lg bg-teal-700 px-4 py-2 text-sm text-white">Try again</button><Link href="/" className="px-4 py-2 text-sm text-teal-700">Dashboard</Link></div></div></main>;
}
