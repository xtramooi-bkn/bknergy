import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isLocalDevelopment, preparationSnapshot } from "@/src/lib/brickken/deployment";
import { loadDeployment } from "@/src/lib/brickken/deployment.server";
import DeploymentReview from "./review";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "BKNergy | Review sandbox deployment", robots: { index: false, follow: false } };

export default async function DeployPage() {
  const requestHeaders = await headers();
  if (!isLocalDevelopment(process.env.NODE_ENV, requestHeaders.get("host"))) notFound();
  const deployment = await loadDeployment().catch(() => null);
  if (!deployment) {
    return <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Deployment preparation unavailable</h1>
      <p className="mt-4">The saved response is missing, invalid, or differs from the approved preparation. No wallet action is available.</p>
    </main>;
  }
  return <DeploymentReview key={preparationSnapshot(deployment)} deployment={deployment} />;
}
