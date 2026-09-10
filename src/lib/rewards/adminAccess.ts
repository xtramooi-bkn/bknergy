import "server-only";
import { headers } from "next/headers";
export async function isLocalRewardAdmin() {
 const host=(await headers()).get("host") ?? "";
 // Local single-user demo only. Replace with authenticated admin authorization before deployment.
 return process.env.NODE_ENV==="development" && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
}
