import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync("src/lib/brickken/distributeReward.ts","utf8");
const migration=fs.readFileSync("supabase/migrations/20260911_brickken_reward_preparations.sql","utf8");
const ui=fs.readFileSync("src/components/rewards/BrickkenDistribution.tsx","utf8");
test("reward distribution has durable wallet, reservation, and atomic submission protections",()=>{
 assert.match(migration,/participant_reward_wallets/);assert.match(migration,/submission_started_at/);assert.match(migration,/claim_reward_transfer_submission/);assert.match(migration,/reconciliation_provenance/);
 assert.match(source,/walletFor\(reward\)/);assert.match(source,/Participant wallet missing/);assert.match(source,/assertReservation\(reward\)/);
 assert.match(source,/claim_reward_transfer_submission/);assert.match(source,/release_reward_transfer_submission/);assert.match(source,/submission_started_at/);
 assert.match(source,/method:"transferTo"/);assert.match(source,/BRICKKEN_SANDBOX_API_KEY/);assert.doesNotMatch(source,/PRIVATE_KEY/);
 assert.match(source,/confirmation!=="RECONCILE"/);assert.match(migration,/manual_historical_confirmed/);assert.match(ui,/I independently verified this evidence/);
});
test("historical reconciliation claims only a stranded processing reward",()=>{
 assert.match(migration,/create or replace function public\.claim_reward_reconciliation/);assert.match(migration,/claimed\.status<>'processing'/);
 assert.match(migration,/Reward has an active or unresolved blockchain submission/);assert.doesNotMatch(migration,/distribution_attempts=distribution_attempts\+1/);
 assert.match(source,/rpc\("claim_reward_reconciliation"/);assert.doesNotMatch(source,/reconcileExistingRewardTransfer[\s\S]*claim_reward_distribution/);
 assert.match(migration,/if claimed\.status='distributed'/);assert.match(source,/receipt\.status!=="0x1"/);
});


test("stuck submission release is status-gated and preserves preparation",()=>{
 assert.match(migration,/release_reward_transfer_submission_claim/);assert.match(migration,/p\.submitted_at is null/);assert.match(migration,/p\.transaction_hash is null/);assert.match(migration,/submission_started_at=null/);
 assert.match(source,/status\.status!=="init"/);assert.match(source,/Brickken status could not be confirmed/);assert.match(source,/release_reward_transfer_submission_claim/);
 assert.match(source,/p\.submitted_at\|\|prep\.transaction_hash/);assert.match(source,/reward\.status!=="processing"/);
 assert.match(ui,/Release stuck submission/);assert.match(ui,/pre-submit/);assert.doesNotMatch(source,/PRIVATE_KEY/);
});

test("Brickken signed submission uses the documented singular payload field",()=>{
 assert.match(source,/body:JSON\.stringify\(\{txId,signedTransaction:signed\.trim\(\)\}\)/);
 assert.doesNotMatch(source,/signedTransactions\s*:/);
});

test("single-composite submission and recovery claims are accepted without weakening their RPC guards",()=>{
 assert.match(migration,/claim_reward_transfer_submission[\s\S]*?returns public\.reward_transfer_preparations[\s\S]*?return saved;/);
 assert.match(migration,/release_reward_transfer_submission_claim[\s\S]*?returns public\.reward_transfer_preparations[\s\S]*?return released;/);
 assert.match(source,/const singleComposite=<T>\(data:T\|T\[\]\|null\|undefined\):T\|null=>Array\.isArray\(data\)\?data\[0\]\?\?null:data\?\?null;/);
 assert.match(source,/const claimed=singleComposite\(claim\);if\(claimError\|\|!claimed\)throw new Error\("Prepared transfer is already claimed or submitted\."\);try\{const sent=await api\("\/send-transactions"/);
 assert.match(source,/const releasedPreparation=singleComposite\(released\);if\(releaseError\|\|!releasedPreparation\)throw new Error\("Submission claim was already released or changed\."\);/);
 assert.doesNotMatch(source,/claim_reward_transfer_submission[\s\S]{0,280}claim\?\.\[0\]/);
 assert.doesNotMatch(source,/release_reward_transfer_submission_claim[\s\S]{0,280}released\?\.\[0\]/);
});
test("Brickken submission accepts either documented transaction hash response field",()=>{
 assert.match(source,/const txHash=typeof sent\.txHash==="string"\?sent\.txHash:typeof sent\.transactionHash==="string"\?sent\.transactionHash:"";/);
 assert.match(source,/if\(!hash\.test\(txHash\)\)throw new Error\("Brickken response is ambiguous; reconcile before retrying\."\);/);
 assert.equal((source.match(/api\("\/send-transactions"/g)??[]).length,1);
});

test("polling records a returned hash before confirming or continuing a Brickken transfer",()=>{
 assert.match(source,/const providerTxHash=typeof result\.transactionHash==="string"\?result\.transactionHash:typeof result\.txHash==="string"\?result\.txHash:"";/);
 assert.match(source,/if\(!prep\.transaction_hash&&hash\.test\(providerTxHash\)\)\{const \{error:record\}=await db\.rpc\("record_reward_transfer_submission",\{p_reward_id:rewardId,p_attempt_id:prep\.attempt_id,p_tx_id:prep\.brickken_transaction_id,p_tx_hash:providerTxHash\}\);/);
 assert.match(source,/if\(result\.status==="success"\)\{if\(!hash\.test\(txHash\)\)throw new Error\("Brickken confirmed a transfer without a valid transaction hash; reconcile before retrying\."\);const \{data:finished,error:finish\}=await db\.rpc\("finish_reward_distribution",\{p_reward_id:rewardId,p_attempt_id:prep\.attempt_id,p_outcome:"success",p_transaction_hash:txHash/);
 assert.doesNotMatch(source,/result\.status==="pending"[\s\S]{0,200}release_reward_transfer_submission/);
});