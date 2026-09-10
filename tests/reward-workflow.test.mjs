// Run with: node --test tests/reward-workflow.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const id = '00000000-0000-4000-8000-000000000001';
const base = { id, campaign_id: 'server-campaign', name: 'Run', type: 'running', source: 'Garmin', distance_meters: 5240, duration_seconds: 1902, gps_available: true, avg_heart_rate: 154 };
function harness(activity = base, initialReward = null, options = {}) {
  let reward = initialReward;
  let inserts = 0;
  let remaining = options.budget ?? 10000;
  const db = {
    async rpc(name, args) {
      assert.equal(name, "reserve_activity_reward"); assert.deepEqual(args, { p_activity_id: activity.id });
      if (reward) return { data: [reward], error: null };
      const amount = Math.floor(Math.min(activity.distance_meters / 1000 * (options.rate ?? 10), options.cap ?? Infinity));
      if (amount > remaining) return { data: null, error: { code: "P0001", message: "Campaign has insufficient remaining budget" } };
      remaining -= amount; inserts++;
      reward = { id: "00000000-0000-4000-8000-000000000099", activity_id: activity.id, user_id: activity.user_id ?? null, campaign_id: activity.campaign_id, amount, status: "pending", transaction_hash: null, brickken_transaction_id: null, created_at: null };
      return { data: [reward], error: null };
    },
    from(table) {
      let insert;
      return {
        select() { return this; }, eq() { return this; }, order() { return this; },
        then(resolve) {
          const campaign = { id: "server-campaign", name: "Challenge", token: "BKNE", reward_pool: 10000, remaining_pool: remaining, status: options.status ?? "active" };
          const rule = { id: "rule-1", campaign_id: campaign.id, activity_type: "running", metric: "distance_km", threshold: 1, reward_amount: options.rate ?? 10, max_reward: options.cap ?? null };
          return Promise.resolve({ data: table === "campaigns" ? [campaign] : options.noRule ? [] : [rule], error: options.error ? { message: "Unavailable" } : null }).then(resolve);
        },
        upsert(value, options) { assert.deepEqual(options, { onConflict: 'activity_id', ignoreDuplicates: true }); insert = value; return this; },
        async maybeSingle() {
          if (insert) {
            if (reward) return { data: null, error: null };
            inserts++;
            reward = { id: 'reward-1', ...insert, transaction_hash: null, brickken_transaction_id: null, created_at: null };
          }
          return { data: table === 'activities' ? activity : reward, error: null };
        },
      };
    },
  };
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    new Function('require', 'exports', js)((name) => {
      if (name === 'server-only') return {};
      if (name === 'react') return { cache: fn => fn };
      if (name.includes('supabase/rewardAdmin')) return { getRewardAdminClient: () => db };
      const target = name.startsWith('@/') ? name.slice(2) : path.join(path.dirname(file), name);
      return load(target + '.ts');
    }, exports);
    return exports;
  }
  return { create: load('src/lib/rewards/createRewardForActivity.ts').createRewardForActivity,
    distribute: load('src/lib/brickken/distributeReward.ts').distributeReward,
    normalize: load("src/lib/activities/normalizeActivity.ts").normalizeActivity,
    map: load("src/lib/activities/activity.ts").mapActivity,
    verify: load("src/lib/verification/verifyActivity.ts").verifyActivity,
    calculate: load("src/lib/rewards/calculateReward.ts").calculateReward,
    inserts: () => inserts, remaining: () => remaining };
}
test('server recalculates 52 BKNE, stores pending and ignores stored scores', async () => {
  const h = harness({ ...base, user_id: "server-user", campaign_id: "server-campaign", verification_score: 0, reward_amount: 99999 });
  const reward = await h.create(id);
  assert.equal(reward.amount, 52); assert.equal(reward.status, 'pending'); assert.equal(reward.user_id, 'server-user'); assert.equal(reward.campaign_id, 'server-campaign');
});
test('rejected and review activities never insert rewards', async () => {
  for (const overrides of [{ source: 'Manual' }, { source: 'Manual', distance_meters: 20000, duration_seconds: 1800, gps_available: false, avg_heart_rate: null }]) {
    const h = harness({ ...base, ...overrides });
    await assert.rejects(h.create(id), /not verified/); assert.equal(h.inserts(), 0);
  }
});
test('retries and concurrent callers return the database winner without resetting status', async () => {
  const h = harness();
  const results = await Promise.all(Array.from({ length: 10 }, () => h.create(id)));
  assert.equal(h.inserts(), 1); assert.ok(results.every(r => r.id === results[0].id));
  const existing = { ...results[0], status: 'distributed', transaction_hash: '0xexample' };
  const retry = harness(base, existing);
  assert.deepEqual(await retry.create(id), existing); assert.equal(retry.inserts(), 0);
});
test('invalid and unknown IDs cannot insert', async () => {
  const h = harness(null); await assert.rejects(h.create('bad-id'), /Invalid/);
  await assert.rejects(h.create(id), /not found/); assert.equal(h.inserts(), 0);
});
test('Brickken placeholder does not mutate pending reward', async () => {
  const h = harness(); const reward = await h.create(id); const copy = structuredClone(reward);
  assert.equal((await h.distribute(reward.id)).status, 'not_connected'); assert.deepEqual(reward, copy);
});

test('database rate and per-activity cap determine reward', async () => {
  assert.equal((await harness(base, null, { rate: 20 }).create(id)).amount, 104);
  assert.equal((await harness(base, null, { cap: 30 }).create(id)).amount, 30);
});
test('missing campaign, missing rule, inactive campaign and unavailable database fail closed', async () => {
  for (const h of [harness({ ...base, campaign_id: null }), harness(base, null, { noRule: true }), harness(base, null, { status: 'paused' }), harness(base, null, { error: true })]) {
    await assert.rejects(h.create(id)); assert.equal(h.inserts(), 0);
  }
});
test('all activity rates, duration boundaries, caps and verification threshold', () => {
  const { calculate } = harness();
  const activity = { type: 'running', campaignId: 'server-campaign', distanceMeters: 5240 };
  const rule = { id: 'r', campaign_id: 'server-campaign', activity_type: 'running', metric: 'distance_km', reward_amount: 10, threshold: 1, max_reward: null };
  assert.equal(calculate(activity, 80, rule), 52);
  assert.equal(calculate(activity, 79, rule), 0);
  assert.equal(calculate(activity, 100, null), 0);
  assert.equal(calculate(activity, 100, { ...rule, campaign_id: 'other' }), 0);
  assert.equal(calculate(activity, 100, { ...rule, threshold: 0 }), 0);
  assert.equal(calculate({ ...activity, type: 'walking', distanceMeters: 3800 }, 100, { ...rule, activity_type: 'walking', reward_amount: 2 }), 7);
  assert.equal(calculate({ ...activity, type: 'cycling', distanceMeters: 12000 }, 100, { ...rule, activity_type: 'cycling', reward_amount: 1 }), 12);
  const workout = { ...rule, activity_type: 'workout', metric: 'duration_minutes', reward_amount: 25, threshold: 30 };
  for (const [seconds, expected] of [[1799, 0], [1800, 25], [3599, 25], [3600, 50]]) {
    assert.equal(calculate({ ...activity, type: 'workout', durationSeconds: seconds }, 100, workout), expected);
  }
});
test('service handles insufficient budget without inserting or deducting', async () => {
  const h = harness(base, null, { budget: 51 });
  await assert.rejects(h.create(id), /insufficient remaining budget/);
  assert.equal(h.inserts(), 0); assert.equal(h.remaining(), 51);
});
test('service reserves exactly once and never crosses zero', async () => {
  const h = harness(base, null, { budget: 52 });
  await Promise.all(Array.from({length: 10}, () => h.create(id)));
  assert.equal(h.inserts(), 1); assert.equal(h.remaining(), 0);
});
test('normalizes all providers and preserves routes',()=>{
 const {normalize}=harness();
 for(const source of ['demo','garmin','strava','apple_health','health_connect','manual']) {
 const a=normalize({id,name:'Activity',type:'RUNNING',source,distanceMeters:1000,durationSeconds:600,routePoints:[{lat:53,lng:6},{lat:53.1,lng:6.1}]});
 assert.equal(a.source,source);assert.equal(a.type,'running');assert.equal(a.routePoints.length,2);assert.equal(a.isManual,source==='manual');assert.equal(a.isDemo,source==='demo');
 }
 assert.throws(()=>normalize({source:'unknown'}));
});
test('legacy demo data and manual scenarios retain verification semantics',()=>{
 const {map,verify}=harness();const legacy=map(base);
 assert.equal(legacy.source,'demo');assert.equal(legacy.originalSource,'Garmin-style activity');assert.equal(verify(legacy).score,100);
 const manual=map({...base,source:'demo',is_demo:true,is_manual:true,original_source:'Manual-entry activity'});
 assert.equal(verify(manual).score,75);
 const future=map({...base,source:'strava',is_demo:false});assert.equal(future.source,'strava');assert.equal(future.isDemo,false);
});
