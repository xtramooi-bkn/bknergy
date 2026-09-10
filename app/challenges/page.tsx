import MyCampaigns from "@/src/components/campaigns/MyCampaigns";
import Link from "next/link";
import AvailableChallenges from "@/src/components/campaigns/AvailableChallenges";
export default function ChallengesPage(){return <main className="mx-auto max-w-6xl p-5 sm:p-8"><Link className="text-sm text-teal-700" href="/">← Dashboard</Link><h1 className="mt-5 text-3xl font-semibold">Challenges</h1><p className="mt-2 text-sm text-slate-500">Johan’s demo challenges. Join, assign a demo activity, then earn verified rewards.</p><MyCampaigns/><AvailableChallenges/></main>;}
