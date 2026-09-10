import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {PGlite} from '../work/budget-test-runtime/node_modules/@electric-sql/pglite/dist/index.js';
test('distribution lifecycle, concurrency, retry, sanitization and success persistence',async()=>{
 const db=new PGlite();
 await db.exec("create role anon;create role authenticated;create role service_role;create table rewards(id uuid primary key,activity_id uuid,amount numeric,status text,transaction_hash text,brickken_transaction_id text,created_at timestamptz default now());");
 await db.exec(fs.readFileSync('supabase/migrations/20260908_reward_distribution.sql','utf8'));
 const id='00000000-0000-4000-8000-000000000001';
 await db.query("insert into rewards(id,activity_id,amount,status) values($1,$1,52,'pending')",[id]);
 const claim=()=>db.query('select * from claim_reward_distribution($1)',[id]);
 const finish=(attempt,outcome,hash=null)=>db.query('select * from finish_reward_distribution($1,$2,$3,$4,null)',[id,attempt,outcome,hash]);
 try {
 const attempts=await Promise.allSettled([claim(),claim()]);
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 const claimed=attempts.find(r=>r.status==='fulfilled').value.rows[0];assert.equal(claimed.status,'processing');
 await assert.rejects(finish(id,'success','0xwrong'),/no longer owns/);
 const placeholder=(await finish(claimed.distribution_attempt_id,'not_connected')).rows[0];assert.equal(placeholder.status,'pending');assert.equal(placeholder.last_error,'Brickken not connected');
 // Run the real orchestrator against PostgreSQL, substituting only the integration boundary.
 let result={status:'failed'};let throws=false;let calls=0;
 const client={async rpc(name,args){try {const values=name==='claim_reward_distribution'?[args.p_reward_id]:[args.p_reward_id,args.p_attempt_id,args.p_outcome,args.p_transaction_hash,args.p_brickken_transaction_id];const sql=name==='claim_reward_distribution'?'select * from claim_reward_distribution($1)':'select * from finish_reward_distribution($1,$2,$3,$4,$5)';return {data:(await db.query(sql,values)).rows,error:null}}catch{return {data:null,error:{message:'database error'}}}}};
 const code=ts.transpileModule(fs.readFileSync('src/lib/rewards/processRewardDistribution.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};new Function('require','exports',code)(name=>name==='server-only'?{}:name.includes('rewardAdmin')?{getRewardAdminClient:()=>client}:name.includes('distributeReward')?{distributeReward:async()=>{calls++;if(throws)throw Error('secret provider payload');return result}}:{mapReward:r=>r},exports);
 const processReward=exports.processRewardDistribution;
 throws=true;const failed=await processReward(id);assert.equal(failed.status,'failed');assert.equal(failed.last_error,'Distribution failed. Retry is available.');assert.equal(Number(failed.amount),52);
 throws=false;result={status:'not_connected'};assert.equal((await processReward(id)).status,'pending');
 result={status:'success',transactionHash:'0xconfirmed',brickkenTransactionId:'provider-1'};
 const success=await processReward(id);assert.equal(success.status,'distributed');assert.equal(success.transaction_hash,'0xconfirmed');assert.equal(success.brickken_transaction_id,'provider-1');assert.ok(success.distributed_at);assert.equal(success.distribution_attempts,4);
 const before=calls;await assert.rejects(processReward(id),/Cannot claim/);assert.equal(calls,before);
 await assert.rejects(processReward('00000000-0000-4000-8000-000000000099'),/Cannot claim/);
 await db.exec('set role anon');await assert.rejects(claim(),/permission denied/);await db.exec('reset role');
 }finally{await db.close()}
});

