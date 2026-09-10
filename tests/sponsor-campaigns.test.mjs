import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {PGlite} from '../work/budget-test-runtime/node_modules/@electric-sql/pglite/dist/index.js';
function load(file){const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','exports',code)(name=>name==='server-only'?{}:name==='react'?{cache:f=>f}:name.includes('rewardAdmin')?{}:load((name.startsWith('@/')?name.slice(2):path.join(path.dirname(file),name))+'.ts'),exports);return exports;}
const org='22222222-2222-4222-8222-222222222221';
const user='11111111-1111-1111-1111-111111111111';
const campaign={organisation_id:org,name:'Sponsor test',description:'Move together',start_date:'2020-01-01',end_date:'2099-12-31',reward_pool:10000,status:'active',audience:'public',max_reward_per_participant:null,max_reward_per_day:null};
const rules=[{activity_type:'running',metric:'distance_km',threshold:1,reward_amount:10,max_reward:null}];
test('server validates campaign fields and neutral reward metrics',()=>{
 const {validateLaunch}=load('src/lib/campaigns/launchValidation.ts');
 assert.deepEqual(validateLaunch({campaign,rules}),{campaign,rules});
 for(const change of [{reward_pool:-1},{reward_pool:0},{reward_pool:NaN},{remaining_pool:10000},{end_date:'2020-02-31'},{start_date:'2099-01-01',end_date:'2020-01-01'},{max_reward_per_day:-1}])assert.throws(()=>validateLaunch({campaign:{...campaign,...change},rules}));
 assert.throws(()=>validateLaunch({campaign,rules:[...rules,...rules]}));
 const {calculateReward}=load('src/lib/rewards/calculateReward.ts');
 for(const [metric,threshold,amount,expected] of [['active_minutes',30,25,25],['steps',1000,2,10],['activity_count',1,8,8],['distance_km',1,10,52]]){
 const rule={id:'r',campaign_id:'c',activity_type:'running',metric,threshold,reward_amount:amount,max_reward:null};
 const activity={campaignId:'c',type:'running',distanceMeters:5240,durationSeconds:1902,steps:5842};
 assert.equal(calculateReward(activity,100,rule),expected);assert.equal(calculateReward(activity,79,rule),0);
 }
});
test('discovery hides drafts, closed dates and restricted audiences',()=>{
 const {availableCampaigns}=load('src/lib/campaigns/sponsorQueries.ts');
 const campaigns=[{...campaign,id:'active'}, {...campaign,id:'draft',status:'draft'}, {...campaign,id:'paused',status:'paused'}, {...campaign,id:'future',start_date:'2099-01-01'}, {...campaign,id:'private',audience:'employees'}, {...campaign,id:'invited',audience:'invite_only'}];
 const list=availableCampaigns({campaigns,participants:[{campaign_id:'invited',user_id:user,status:'active'}],userId:user});
 assert.deepEqual(list.map(c=>c.id),['active','invited']);
});
test('SQL sponsor launch, joining, assignment, caps and existing atomic guarantees',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`
 create role anon;create role authenticated;create role service_role;
 create table users(id uuid primary key);
 create table campaigns(id uuid primary key default gen_random_uuid(),name text,token text default 'BKNE',reward_pool numeric not null,remaining_pool numeric,status text);
 create table activities(id uuid primary key,user_id uuid references users(id),campaign_id uuid references campaigns(id),type text,source text,distance_meters numeric,duration_seconds numeric,steps numeric,gps_available boolean,avg_heart_rate numeric);
 create table reward_rules(id uuid primary key default gen_random_uuid(),campaign_id uuid references campaigns(id),activity_type text,metric text,threshold numeric,reward_amount numeric,max_reward numeric,unique(campaign_id,activity_type));
 create table rewards(id uuid primary key default gen_random_uuid(),activity_id uuid unique references activities(id),user_id uuid,campaign_id uuid references campaigns(id),amount numeric,status text default 'pending',transaction_hash text,brickken_transaction_id text,created_at timestamptz default now());
 `);
 await db.query('insert into users values($1)',[user]);
 const legacy='00000000-0000-4000-8000-000000000001';
 await db.query("insert into campaigns(id,name,reward_pool,remaining_pool,status) values($1,'September Move Challenge',10000,10000,'active')",[legacy]);
 let seq=10;async function activity(type='running',manual=false){const id='00000000-0000-4000-8000-'+String(seq++).padStart(12,'0');await db.query("insert into activities(id,user_id,campaign_id,type,source,distance_meters,duration_seconds,steps,gps_available,avg_heart_rate) values($1,$2,$3,$4,$5,5240,1902,5842,true,154)",[id,user,legacy,type,manual?'manual':'garmin']);return id;}
 await activity();
 for(const file of ['20260908_atomic_reward_budgets.sql','20260908_activity_sources.sql','20260908_reward_distribution.sql','20260909_campaign_budget_reconciliation.sql','20260910_sponsor_campaigns.sql','20260911_participant_redemptions.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 assert.equal((await db.query('select * from organisations')).rows.length,3);
 assert.equal((await db.query('select organisation_id from campaigns where id=$1',[legacy])).rows[0].organisation_id,org);
 const create=async(c=campaign,r=rules)=>(await db.query('select create_sponsor_campaign($1::jsonb,$2::jsonb) id',[JSON.stringify(c),JSON.stringify(r)])).rows[0].id;
 const join=id=>db.query('select join_demo_campaign($1) id',[id]);
 const assign=(a,c)=>db.query('select assign_demo_activity_campaign($1,$2)',[a,c]);
 const reserve=a=>db.query('select * from reserve_activity_reward($1)',[a]);
 const fourRules=['running','walking','cycling','workout'].map((type,i)=>({...rules[0],activity_type:type,metric:i===3?'active_minutes':'distance_km',threshold:i===3?30:1,reward_amount:[10,2,1,25][i]}));
 const full=await create(campaign,fourRules);assert.equal((await db.query('select * from reward_rules where campaign_id=$1',[full])).rows.length,4);
 const created=await create();
 let row=(await db.query('select * from campaigns where id=$1',[created])).rows[0];assert.equal(Number(row.reward_pool),10000);assert.equal(Number(row.remaining_pool),10000);
 assert.equal((await db.query('select * from reward_rules where campaign_id=$1',[created])).rows.length,1);
 const before=(await db.query('select count(*) n from campaigns')).rows[0].n;
 for(const c of [{...campaign,reward_pool:-1},{...campaign,remaining_pool:1},{...campaign,max_reward_per_day:-1}])await assert.rejects(create(c));
 await assert.rejects(create(campaign,[...rules,...rules]));assert.equal((await db.query('select count(*) n from campaigns')).rows[0].n,before);
 const draft=await create({...campaign,status:'draft'});await assert.rejects(join(draft),/not open/);
 await db.query("select set_sponsor_campaign_status($1,'active')",[draft]);await join(draft);
 const privateId=await create({...campaign,audience:'employees'});await assert.rejects(join(privateId),/invitation/);
 const results=await Promise.all([join(created),join(created)]);assert.equal(results[0].rows[0].id,results[1].rows[0].id);
 assert.equal(Number((await db.query("select count(*) n from campaign_participants where campaign_id=$1 and status='active'",[created])).rows[0].n),1);
 const run=await activity();await assign(run,created);const paid=(await reserve(run)).rows[0];assert.equal(Number(paid.amount),52);
 assert.equal((await reserve(run)).rows[0].id,paid.id);await assert.rejects(assign(run,draft),/cannot change campaign/);
 row=(await db.query('select * from get_campaign_budget_integrity($1)',[created])).rows[0];assert.equal(Number(row.remaining_pool),9948);assert.equal(row.is_consistent,true);
 const claimed=(await db.query('select * from claim_reward_distribution($1)',[paid.id])).rows[0];await assert.rejects(db.query('select * from claim_reward_distribution($1)',[paid.id]),/already processing/);
 await db.query("select * from finish_reward_distribution($1,$2,'not_connected')",[paid.id,claimed.distribution_attempt_id]);assert.equal(Number((await db.query('select remaining_pool from campaigns where id=$1',[created])).rows[0].remaining_pool),9948);
 const rejected=await activity();await db.query('update activities set is_manual=true where id=$1',[rejected]);await assign(rejected,created);await assert.rejects(reserve(rejected),/not verified/);
 const capped=await create({...campaign,max_reward_per_day:52});await join(capped);const a1=await activity(),a2=await activity();await assign(a1,capped);await assign(a2,capped);await reserve(a1);await assert.rejects(reserve(a2),/cap exceeded/);
 const totalCapped=await create({...campaign,max_reward_per_participant:52});await join(totalCapped);
 const tc1=await activity(),tc2=await activity();await assign(tc1,totalCapped);await assign(tc2,totalCapped);const tcReward=(await reserve(tc1)).rows[0];
 await db.query("update rewards set status='failed' where id=$1",[tcReward.id]);await assert.rejects(reserve(tc2),/Participant reward cap/);
 const small=await create({...campaign,reward_pool:52});await join(small);const small1=await activity(),small2=await activity();await assign(small1,small);await assign(small2,small);
 const race=await Promise.allSettled([reserve(small1),reserve(small2)]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(Number((await db.query('select remaining_pool from campaigns where id=$1',[small])).rows[0].remaining_pool),0);
 const unjoined=await create();const a3=await activity();await assert.rejects(assign(a3,unjoined),/Join this challenge/);
 for(const [metric,threshold,amount,expected] of [['active_minutes',30,25,25],['steps',1000,2,10],['activity_count',1,8,8]]){
 const c=await create(campaign,[{...rules[0],metric,threshold,reward_amount:amount}]);await join(c);const a=await activity();await assign(a,c);assert.equal(Number((await reserve(a)).rows[0].amount),expected);
 }
 await db.exec('set role anon');await assert.rejects(create(),/permission denied/);await db.exec('reset role');
 await db.exec('set role service_role');const serviceCampaign=await create();await join(serviceCampaign);await db.exec('reset role');
 }finally{await db.close();}
});
