import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isLocalDevelopment } from "@/src/lib/brickken/deployment";
import WhitelistReview from "./review";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "BKNergy | Whitelist review", robots: { index: false, follow: false } };
const signer = "0xE95900Ca65EF152a5D9FEe1c61b71bBeD00dFcF6";
export default async function WhitelistPage() {
  if (!isLocalDevelopment(process.env.NODE_ENV, (await headers()).get("host"))) notFound();
  const source = JSON.parse(await readFile(process.cwd() + "/outputs/bkne-whitelist-preparation.json", "utf8"));
  const tx = source?.transactions?.[0];
  if (!tx || source.txId !== "0x1fa763364a9ec94e6f9e5f6e8ddaacf8235249982250ee4813969d30f2721cb2" || tx.nonce !== 2 || tx.chainId !== 84532 || tx.from !== signer || typeof tx.data !== "string") notFound();
  const checksum = createHash("sha256").update(Buffer.from(tx.data.slice(2), "hex")).digest("hex");
  if (checksum !== "a6ec9b8082ef3c2e577e7b3bf79ef5a7f3d780788e9283f5d13a526204e9d225") notFound();
  return <WhitelistReview tx={tx} txId={source.txId} checksum={checksum} />;
}
