// Temporary runtime setup: npm install --prefix work/budget-test-runtime --no-save --package-lock=false @electric-sql/pglite
// Run: node --test tests/reward-budget-sql.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '../work/budget-test-runtime/node_modules/@electric-sql/pglite/dist/index.js';

test('real SQL migration and transactional reward budget scenarios', async () => {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table campaigns (id uuid primary key, reward_pool numeric not null, remaining_pool numeric, status text);
    create table activities (id uuid primary key, user_id uuid, campaign_id uuid references campaigns(id), type text, source text, distance_meters numeric, duration_seconds numeric, gps_available boolean, avg_heart_rate numeric);
    create table reward_rules (id uuid primary key, campaign_id uuid references campaigns(id), activity_type text, metric text, reward_amount numeric, threshold numeric, max_reward numeric, unique(campaign_id, activity_type));
    create table rewards (id uuid primary key default gen_random_uuid(), activity_id uuid unique references activities(id), user_id uuid, campaign_id uuid references campaigns(id), amount numeric, status text default 'pending', transaction_hash text, brickken_transaction_id text, created_at timestamptz default now());
  `);
  await db.exec(fs.readFileSync('supabase/migrations/20260908_atomic_reward_budgets.sql', 'utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20260908_activity_sources.sql', 'utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20260909_campaign_budget_reconciliation.sql', 'utf8'));
  const campaign = '00000000-0000-4000-8000-000000000001';
  const rule = '00000000-0000-4000-8000-000000000002';
  let sequence = 10;
  const activityId = () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, '0')}`;
  async function fixture(pool = 100) {
    await db.exec('truncate rewards, reward_rules, activities, campaigns cascade');
    await db.query('insert into campaigns values ($1,$2,$2,\'active\')',[campaign,pool]);
    await db.query("insert into reward_rules values ($1,$2,'running','distance_km',10,1,null)",[rule,campaign]);
  }
  async function activity(overrides = {}) {
    const id = activityId();
    const a = { source:'garmin', distance:5240, duration:1902, gps:true, hr:154, ...overrides };
    await db.query("insert into activities (id,user_id,campaign_id,type,source,distance_meters,duration_seconds,gps_available,avg_heart_rate) values ($1,null,$2,'running',$3,$4,$5,$6,$7)",[id,campaign,a.source,a.distance,a.duration,a.gps,a.hr]);
    return id;
  }
  const reserve = id => db.query('select * from reserve_activity_reward($1)',[id]);
  const remaining = async () => Number((await db.query('select remaining_pool from campaigns')).rows[0].remaining_pool);
  const count = async () => Number((await db.query('select count(*) from rewards')).rows[0].count);
  try {
    await fixture(); const run = await activity();
    const created = (await reserve(run)).rows[0];
    assert.equal(Number(created.amount),52); assert.equal(created.status,'pending'); assert.equal(await remaining(),48);
    assert.equal((await reserve(run)).rows[0].id,created.id); assert.equal(await remaining(),48); assert.equal(await count(),1);
    const second = await activity(); await assert.rejects(reserve(second),/insufficient remaining budget/);
    assert.equal(await remaining(),48); assert.equal(await count(),1);
    await fixture(); const demoManual=await activity();
    await db.query("update activities set source='demo', is_manual=true where id=$1",[demoManual]);
    await assert.rejects(reserve(demoManual),/not verified/);assert.equal(await count(),0);
    await fixture(52); await reserve(await activity()); assert.equal(await remaining(),0);
    await assert.rejects(reserve(await activity()),/insufficient remaining budget/); assert.equal(await remaining(),0);
    await assert.rejects(db.exec('update campaigns set remaining_pool = -1'),/campaigns_budget_bounds/);
    await fixture(); const rejected = await activity({source:'manual',distance:20000,duration:1800,gps:false,hr:null});
    await assert.rejects(reserve(rejected),/not verified/); assert.equal(await count(),0); assert.equal(await remaining(),100);
    await fixture(52); const ids = await Promise.all([activity(),activity(),activity()]);
    const results = await Promise.allSettled(ids.map(reserve));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1); assert.equal(await count(),1); assert.equal(await remaining(),0);
    // An error during pool deduction rolls back the preceding reward insert too.
    await fixture(); const rollbackId = await activity();
    await db.exec("create function reject_budget_update() returns trigger language plpgsql as $$ begin raise exception 'simulated deduction failure'; end $$; create trigger reject_budget before update on campaigns for each row execute function reject_budget_update();");
    await assert.rejects(reserve(rollbackId),/simulated deduction failure/); assert.equal(await count(),0); assert.equal(await remaining(),100);
    await db.exec('drop trigger reject_budget on campaigns');
    // Public clients cannot reserve or directly insert rewards; service role can reserve only.
    await db.exec('set role anon'); await assert.rejects(reserve(rollbackId),/permission denied/); await db.exec('reset role');
    await db.exec('set role service_role');
    await assert.rejects(db.query("insert into rewards(activity_id,amount,status) values ($1,999,'pending')",[rollbackId]),/permission denied/);
    await reserve(rollbackId); await db.exec('reset role'); assert.equal(await remaining(),48);
    console.log('SQL: within budget, insufficient budget, duplicates, rejected, exact deduction, zero floor, competing requests, rollback, and access controls passed.');
  } finally { await db.close(); }
});
