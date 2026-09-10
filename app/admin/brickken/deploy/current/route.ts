import { isLocalDevelopment } from "@/src/lib/brickken/deployment";
import { loadDeployment } from "@/src/lib/brickken/deployment.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!isLocalDevelopment(process.env.NODE_ENV, request.headers.get("host")) ||
      request.headers.get("sec-fetch-site") === "cross-site")
    return new Response(null, { status: 404, headers });
  try {
    return Response.json(await loadDeployment(), { headers });
  } catch {
    return Response.json({ error: "Saved preparation is unavailable or invalid." }, { status: 409, headers });
  }
}
