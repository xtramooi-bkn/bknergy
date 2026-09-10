import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {PGlite} from '../work/budget-test-runtime/node_modules/@electric-sql/pglite/dist/index.js';
function load(file){const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','exports',code)(name=>name==='server-only'?{}:name==='react'?{cache:f=>f}:name.includes('rewardAdmin')?{}:load((name.startsWith('@/')?name.slice(2):path.join(path.dirname(file),name))+'.ts'),exports);return exports;}
const user='11111111-1111-1111-1111-111111111111';
const c='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
test('joined and available campaigns are distinct, including completed memberships',()=>{
 const {participantCampaignGroups}=load('src/lib/campaigns/participantVisibility.ts');
 const base={status:'active',audience:'public',start_date:null,end_date:null};
 const grouped=participantCampaignGroups({userId:user,campaigns:[{...base,id:c},{...base,id:other},{...base,id:'completed',status:'completed'},{...base,id:'draft',status:'draft'}],participants:[{campaign_id:c,user_id:user,status:'active'},{campaign_id:'completed',user_id:user,status:'completed'},{campaign_id:'draft',user_id:user,status:'active'}]});
 assert.deepEqual(grouped.joined.map(c=>c.id),[c,'completed']);assert.deepEqual(grouped.available.map(c=>c.id),[other]);
});
test('redemption input rejects fabricated totals, identities and destinations',()=>{
 const {validateRedemption}=load('src/lib/redemptions/validation.ts');
 const form=new FormData();for(const [k,v] of Object.entries({campaignId:c,requestId:other,amount:'2500',type:'cash',destination:'demo_cash'}))form.set(k,v);
 assert.equal(validateRedemption(form).amount,2500);
 for(const amount of ['-1','0','1.2','NaN','Infinity']){form.set('amount',amount);assert.throws(()=>validateRedemption(form));}
 form.set('amount','2500');form.set('userId',user);assert.throws(()=>validateRedemption(form));form.delete('userId');form.set('euro_value','9999');assert.throws(()=>validateRedemption(form));form.delete('euro_value');form.set('destination','bank-account');assert.throws(()=>validateRedemption(form));
});
test('transactional redemption: distributed only, campaign isolation, idempotency, races and rate snapshots',async()=>{
 const db=new PGlite();let seq=10;const key=()=> '00000000-0000-4000-8000-'+String(seq++).padStart(12,'0');
 try{
 await db.exec('create role anon;create role authenticated;create role service_role;create table users(id uuid primary key);create table demo_participant(user_id uuid);create table campaigns(id uuid primary key);create table campaign_participants(user_id uuid,campaign_id uuid);create table activities(user_id uuid,campaign_id uuid,distance_meters numeric,duration_seconds numeric,steps numeric);create table rewards(user_id uuid,campaign_id uuid,amount numeric,status text);');
 await db.query('insert into users values($1);',[user]);await db.query('insert into demo_participant values($1)',[user]);await db.query('insert into campaigns values($1),($2)',[c,other]);
 await db.exec(fs.readFileSync('supabase/migrations/20260911_participant_redemptions.sql','utf8'));
 const rate=(id,n)=>db.query('select set_campaign_redemption_value($1,$2)',[id,n]);
 const redeem=(amount,id=c,requestId=key(),type='cash',destination='demo_cash')=>db.query('select * from request_demo_redemption($1,$2,$3,$4,$5)',[id,requestId,amount,type,destination]);
 const overview=async()=>(await db.query('select get_demo_reward_overview() data')).rows[0].data;
 await rate(c,100);await rate(other,200);
 await db.query("insert into rewards values($1,$2,2500,'pending'),($1,$2,500,'processing'),($1,$2,100,'failed'),($1,$3,200,'distributed')",[user,c,other]);
 assert.equal((await overview()).available,200);await assert.rejects(redeem(1),/Insufficient distributed/);
 await db.query("update rewards set status='distributed' where campaign_id=$1 and status='pending'",[c]);
 const before=await overview();assert.equal(before.campaigns.find(b=>b.campaign_id===c).earned,3100);assert.equal(before.campaigns.find(b=>b.campaign_id===other).earned,200);
 await assert.rejects(redeem(2501),/Insufficient/);await assert.rejects(redeem(201,other),/Insufficient/);
 const request=key();const rows=await Promise.all([redeem(2500,c,request),redeem(2500,c,request)]);const saved=rows[0].rows[0];assert.equal(saved.id,rows[1].rows[0].id);assert.equal(saved.status,'requested');assert.equal(Number(saved.euro_value),25);
 assert.equal((await overview()).available,200);await assert.rejects(redeem(100,c,request),/different redemption/);
 await rate(c,50);assert.equal(Number((await redeem(2500,c,request)).rows[0].euro_value),25);
 await db.query("update redemptions set status='failed' where id=$1",[saved.id]);assert.equal((await overview()).available,200);await assert.rejects(redeem(1),/Insufficient/);
 const hold=await redeem(200,other,key(),'hold','keep_bkne');assert.equal(hold.rows[0].euro_value,null);assert.equal((await overview()).available,200);
 const race=await Promise.allSettled([redeem(150,other,key(),'donation','demo_youth_sport'),redeem(150,other,key(),'partner_store','sports_voucher')]);assert.equal(race.filter(x=>x.status==='fulfilled').length,1);assert.equal((await overview()).available,50);
 await rate(other,null);await assert.rejects(redeem(50,other),/no funded/);
 await rate(other,100);await db.exec('set role anon');await assert.rejects(redeem(1,other),/permission denied/);await db.exec('reset role');
 await db.exec('set role service_role');await redeem(50,other,key(),'wellness','gym_contribution');await assert.rejects(db.exec('update redemptions set amount_bkne=1'),/permission denied/);await db.exec('reset role');assert.equal((await overview()).available,0);
 }finally{await db.close();}
});
