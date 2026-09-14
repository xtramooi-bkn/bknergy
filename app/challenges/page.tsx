import Icon from "@/src/components/ui/Icon";
import MyCampaigns from "@/src/components/campaigns/MyCampaigns";
import Link from "next/link";
import AvailableChallenges from "@/src/components/campaigns/AvailableChallenges";
export default function ChallengesPage(){return <main className="mx-auto max-w-6xl p-5 sm:p-8"><Link className="text-sm text-teal-700" href="/">← Dashboard</Link><div className="page-heading mt-5"><h1 className=" text-3xl font-semibold"><Icon name="campaign" className="size-7"/>Challenges</h1><p className="mt-2 text-sm text-slate-500">Johan’s demo challenges. Join, assign a demo activity, then earn verified rewards.</p></div><MyCampaigns/><AvailableChallenges/></main>;}
