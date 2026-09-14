import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const signer = fs.readFileSync("tools/local/sign-reward.mjs", "utf8");
const packageSource = fs.readFileSync("src/lib/rewards/signingPackage.ts", "utf8");
const admin = fs.readFileSync("app/admin/rewards/page.tsx", "utf8");
const participant = fs.readFileSync("app/rewards/page.tsx", "utf8");
const distribution = fs.readFileSync("src/lib/rewards/adminAccess.ts", "utf8");
const controls = fs.readFileSync("src/components/rewards/BrickkenDistribution.tsx", "utf8");
const campaigns = fs.readFileSync("src/components/campaigns/AvailableChallenges.tsx", "utf8");
const treasury = fs.readFileSync("src/lib/rewards/treasurySummary.ts", "utf8");

test("safe signing package exposes transfer data without secrets", () => {
  for (const field of ["rewardId", "amount", "tokenSymbol", "tokenContract", "chainId", "brickkenTransactionId", "expectedSigner", "recipientWallet", "transactions"]) assert.match(packageSource, new RegExp(field));
  assert.doesNotMatch(packageSource, /API_KEY|PRIVATE_KEY|SUPABASE_SERVICE_ROLE_KEY|signedTransaction/i);
});
test("generic signer fail-closes invalid reward metadata and never broadcasts", () => {
  for (const phrase of ["wrong network or chain ID", "wrong expected signer", "wrong token contract", "encoded recipient does not match", "encoded BKNE amount does not match", "Brickken transaction ID"]) assert.match(signer, new RegExp(phrase));
  assert.match(signer, /hiddenQuestion/); assert.doesNotMatch(signer, /sendTransaction|eth_sendTransaction|\/send-transactions/);
});
test("participant totals, transaction link, campaign labels, and safe balance fallback are visible", () => {
  assert.match(participant, /Earned in BKNergy/); assert.match(participant, /Distributed BKNE/); assert.match(participant, /sepolia\.basescan\.org\/tx/);
  assert.match(campaigns, /DemoCampaignLabel/); assert.match(admin, /On-chain balance unavailable/); assert.match(treasury, /catch \{ return \{ \.\.\.totals, balance: null \}/);
});
test("admin controls remain local-only", () => {
  assert.match(distribution, /NODE_ENV==="development"/); assert.match(admin, /isLocalRewardAdmin/); assert.match(controls, /DownloadSigningPackage/); assert.match(controls, /Advanced \/ recovery/);
});

test("campaign data remains public while joins stay local-only", () => {
  const challenges = fs.readFileSync("src/components/campaigns/AvailableChallenges.tsx", "utf8");
  const mine = fs.readFileSync("src/components/campaigns/MyCampaigns.tsx", "utf8");
  assert.doesNotMatch(challenges, /if\(!await isLocalRewardAdmin\(\)\)return/);
  assert.match(challenges, /const localAdmin=await isLocalRewardAdmin\(\)/);
  assert.match(challenges, /Demo preview — joining is disabled in the public demo/);
  assert.match(challenges, /localAdmin\?<CampaignCommandForm/);
  assert.match(challenges, /c\.description/); assert.match(challenges, /c\.start_date/); assert.match(challenges, /c\.audience/);
  assert.doesNotMatch(mine, /if\(!await isLocalRewardAdmin\(\)\)return null/);
  assert.match(mine, /Public preview · participant view/);
});