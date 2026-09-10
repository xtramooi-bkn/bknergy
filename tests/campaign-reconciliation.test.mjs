import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '../work/budget-test-runtime/node_modules/@electric-sql/pglite/dist/index.js';
test('reconciliation repairs legacy links, isolates campaigns, retains all reservations and is idempotent',async()=>{
 const db=new PGlite();
 const c='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
 const a='00000000-0000-4000-8000-000000000003',b='00000000-0000-4000-8000-000000000004';
 const sql=fs.readFileSync('supabase/migrations/20260909_campaign_budget_reconciliation.sql','utf8');
 try{
 await db.exec('create role anon;create role authenticated;create role service_role;create table campaigns(id uuid primary key,reward_pool numeric,remaining_pool numeric check(remaining_pool>=0));create table activities(id uuid primary key,campaign_id uuid references campaigns(id));create table rewards(activity_id uuid unique references activities(id),campaign_id uuid references campaigns(id),amount numeric,status text);');
 await db.query('insert into campaigns values($1,10000,9993),($2,200,0)',[c,other]);
 await db.query('insert into activities values($1,$3),($2,$3)',[a,b,c]);
 await db.query("insert into rewards values($1,null,52,'pending'),($2,$3,7,'pending')",[a,b,c]);
 await db.exec(sql);
 const snapshot=async(id=c)=>(await db.query('select * from get_campaign_budget_integrity($1)',[id])).rows[0];
 const reconcile=async(id=c)=>db.query('select reconcile_campaign_reward_pool($1)',[id]);
 assert.equal(Number((await snapshot()).remaining_pool),9941);assert.equal((await snapshot()).is_consistent,true);
 assert.equal(Number((await snapshot(other)).remaining_pool),200);
 await db.exec(sql);await reconcile();assert.equal(Number((await snapshot()).remaining_pool),9941);
 assert.equal(Number((await db.query('select sum(amount) total from rewards')).rows[0].total),59);
 await assert.rejects(db.query("insert into rewards values($1,$2,52,'pending')",[a,c]),/unique/);
 for(const status of ['pending','processing','distributed','failed']){
 await db.query('update rewards set status=$1',[status]);await reconcile();assert.equal(Number((await snapshot()).remaining_pool),9941);
 }
 await db.query('update campaigns set remaining_pool=9993 where id=$1',[c]);assert.equal((await snapshot()).is_consistent,false);
 await reconcile();assert.equal((await snapshot()).is_consistent,true);
 await db.query('update campaigns set reward_pool=10,remaining_pool=0 where id=$1',[c]);await reconcile();
 assert.equal(Number((await snapshot()).remaining_pool),0);assert.equal((await snapshot()).over_reserved,true);assert.equal((await snapshot()).is_consistent,false);
 assert.equal(Number((await snapshot(other)).remaining_pool),200);
 await db.exec('set role anon');await assert.rejects(reconcile(),/permission denied/);await db.exec('reset role');
 }finally{await db.close();}
});
