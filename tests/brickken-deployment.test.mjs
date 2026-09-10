import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  new Function("require", "exports", code)((name) => name === "server-only" ? {} :
    name.startsWith("@/") ? load(name.slice(2) + ".ts") :
    name.startsWith(".") ? load(path.join(path.dirname(file), name) + ".ts") : require(name), exports);
  return exports;
}
const api = load("src/lib/brickken/deployment.ts");
const server = load("src/lib/brickken/deployment.server.ts");
const parsed = JSON.parse(fs.readFileSync("outputs/bknergy-create-tokenization-response.json", "utf8"));
// These scenarios use nonce zero; the live saved preparation may have moved on.
// Change only the in-memory test fixture, never the saved deployment transaction.
parsed.transactions[0].nonce = 0;
const raw = JSON.stringify(parsed);
const deployment = server.parseDeployment(raw);
const tx = deployment.transaction;
const hash = "0x" + "a".repeat(64);
function wallet({latest="0x0", pending="0x0", ...overrides} = {}) {
  const calls = [];
  return { calls, request: async (args) => {
    calls.push(args);
    const value = { eth_chainId:"0x14a34", eth_accounts:[tx.from.toLowerCase()],
      eth_getTransactionCount:args.params?.[1]==="latest"?latest:pending,
      eth_sendTransaction:hash, ...overrides }[args.method];
    if (value instanceof Error) throw value;
    return typeof value === "function" ? value(args) : value;
  }};
}
const submit = (p, d=deployment, current=async()=>d, isCurrent=()=>true) =>
  api.submitDeployment(p, d, isCurrent, current, ()=>{});
function neverSent(p) { assert.equal(p.calls.some(c=>c.method==="eth_sendTransaction"), false); }

test("only loopback development hosts pass", () => {
  for (const host of ["localhost:3000","127.0.0.1:3000","[::1]:3000"]) assert.equal(api.isLocalDevelopment("development",host),true);
  for (const mode of ["production","test",undefined]) assert.equal(api.isLocalDevelopment(mode,"localhost:3000"),false);
  for (const host of [null,"example.com","localhost.evil.com","192.168.1.2:3000","user@localhost","localhost/path"]) assert.equal(api.isLocalDevelopment("development",host),false);
});
test("fresh preparation is loaded dynamically, preserving exact data and allowing new gas, fees, ID and nonce", () => {
  assert.equal(deployment.txId,parsed.txId); assert.equal(tx.data,parsed.transactions[0].data);
  const changed={...parsed,txId:"0x"+"b".repeat(64),transactions:[{...tx,nonce:3,gasLimit:"0x340000",maxFeePerGas:"7000000",data:tx.data.slice(0,-2)+"ff"}]};
  const result=server.parseDeployment(JSON.stringify(changed));
  assert.equal(result.transaction.data,changed.transactions[0].data);
  assert.equal(result.transaction.nonce,3);
  assert.notEqual(result.calldataSha256,deployment.calldataSha256);
  assert.notEqual(api.preparationSnapshot(result),api.preparationSnapshot(deployment));
});
test("wrong chain, wallet, destination, nonzero value, empty data and malformed transaction fail closed", () => {
  for (const change of [{chainId:1},{from:"0x"+"1".repeat(40)},{to:"0x"+"2".repeat(40)},{value:"0x1"},{type:0},
    {data:"0x"},{data:""},{data:"0x123"},{data:"0xzz"},{data:null},{nonce:-1},{nonce:0.5},{nonce:Number.MAX_SAFE_INTEGER+1},
    {gasLimit:"0x0"},{gasLimit:"-1"},{maxFeePerGas:"1",maxPriorityFeePerGas:"2"},{unknown:true}]) {
    assert.throws(()=>server.parseDeployment(JSON.stringify({...parsed,transactions:[{...tx,...change}]})));
  }
  for(const transactions of [[],[tx,tx]]) assert.throws(()=>server.parseDeployment(JSON.stringify({...parsed,transactions})));
  assert.throws(()=>server.parseDeployment("{}")); assert.throws(()=>server.parseDeployment("null"));
});
test("latest and pending are queried for the verified wallet without submitting", async () => {
  const p=wallet();
  assert.deepEqual(await api.readNonceCounts(p,tx),{latest:"0",pending:"0"});
  assert.deepEqual(p.calls.filter(c=>c.method==="eth_getTransactionCount").map(c=>c.params),[[tx.from,"latest"],[tx.from,"pending"]]);
  neverSent(p);
});
test("prepared 0 / latest 0 / pending 0 is allowed, including equivalent padded RPC zero", async () => {
  assert.equal(api.nonceProblem(0,{latest:"0",pending:"0"}),null);
  const p=wallet({latest:"0x00",pending:"0x0"});
  assert.equal(await submit(p),hash);
  const sends=p.calls.filter(c=>c.method==="eth_sendTransaction"); assert.equal(sends.length,1);
  const sent=sends[0].params[0];
  assert.equal(sent.data,tx.data); assert.equal(sent.from,tx.from); assert.equal(sent.to,tx.to);
  for(const key of ["chainId","value","nonce","type","maxFeePerGas","maxPriorityFeePerGas"]) assert.equal(BigInt(sent[key]),BigInt(tx[key]));
  assert.equal(BigInt(sent.gas),BigInt(tx.gasLimit));
});
test("prepared 0 / latest 1 / pending 1 is rejected as stale", async () => {
  const p=wallet({latest:"0x1",pending:"0x1"});
  await assert.rejects(submit(p),/stale: latest on-chain nonce is 1/); neverSent(p);
});
test("prepared 0 / latest 0 / pending 1 is rejected as a pending transaction", async () => {
  const p=wallet({latest:"0x0",pending:"0x1"});
  await assert.rejects(submit(p),/outgoing pending transaction/); neverSent(p);
});
test("nonce gaps, inconsistent counts and malformed RPC are not mislabeled stale", async () => {
  assert.match(api.nonceProblem(2,{latest:"0",pending:"0"}),/nonce gap/);
  assert.match(api.nonceProblem(0,{latest:"1",pending:"0"}),/inconsistent/);
  for(const value of [null,-1,"0","garbage"]) {
    const p=wallet({latest:value});
    await assert.rejects(submit(p),/invalid latest nonce/); neverSent(p);
  }
});
test("a matching nonzero nonce is allowed unchanged", async () => {
  const d={...deployment,transaction:{...tx,nonce:2}};
  const p=wallet({latest:"0x2",pending:"0x2"}); await submit(p,d);
  assert.equal(p.calls.find(c=>c.method==="eth_sendTransaction").params[0].nonce,"0x2");
});
test("malformed pending RPC response is distinguished from a pending transaction", async () => {
  for (const pending of [null, -1, "0", "0x", "garbage", { error: "RPC failed" }]) {
    const p = wallet({ latest: "0x0", pending });
    await assert.rejects(submit(p), /invalid pending nonce/);
    neverSent(p);
  }
});
for (const [latest, pending] of [["0x0", 0], [0, "0x0"]]) {
  test(`mixed nonce types: latest ${JSON.stringify(latest)}, pending ${JSON.stringify(pending)} are accepted`, async () => {
    const p = wallet({ latest, pending });
    const counts = await api.readNonceCounts(p, tx);
    assert.deepEqual(counts, { latest: "0", pending: "0" });
    assert.equal(api.nonceProblem(0, counts), null);
    neverSent(p);
    // Submission is exercised only through the mock provider.
    assert.equal(await submit(p), hash);
    assert.equal(p.calls.find(c => c.method === "eth_sendTransaction").params[0].nonce, "0x0");
  });
}
test("hex strings, safe integers and internal bigints normalize identically", async () => {
  for (const value of [0, 1, 10, Number.MAX_SAFE_INTEGER]) {
    for (const latest of [value, BigInt(value), "0x" + BigInt(value).toString(16)]) {
      const p = wallet({ latest, pending: latest });
      assert.deepEqual(await api.readNonceCounts(p, tx), { latest: String(value), pending: String(value) });
      neverSent(p);
    }
  }
  const p = wallet({ latest: "0x20000000000001", pending: BigInt("9007199254740993") });
  assert.deepEqual(await api.readNonceCounts(p, tx), { latest: "9007199254740993", pending: "9007199254740993" });
  neverSent(p);
});
for (const invalid of [-1, 1.5, "abc", null, undefined, NaN, Infinity, -Infinity,
  Number.MAX_SAFE_INTEGER + 1, BigInt(-1), "0x", "0xgg", "-0x1", "0x1.5", " 0x0", "0", {}, [], true]) {
  test(`invalid nonce ${typeof invalid} ${String(invalid)} is rejected for latest and pending`, async () => {
    for (const tag of ["latest", "pending"]) {
      const p = wallet({ eth_getTransactionCount: args => args.params[1] === tag ? invalid : "0x0" });
      await assert.rejects(submit(p), new RegExp("invalid " + tag + " nonce"));
      neverSent(p);
    }
  });
}
test("wrong wallet and wrong network never query nonce or submit", async () => {
  for(const changes of [{eth_chainId:"0x1"},{eth_accounts:[]},{eth_accounts:["0x"+"1".repeat(40)]}]) {
    const p=wallet(changes); await assert.rejects(submit(p)); neverSent(p);
    assert.equal(p.calls.some(c=>c.method==="eth_getTransactionCount"),false);
  }
});
test("saved data, gas or preparation ID changed after review blocks submission", async () => {
  for(const d of [
    {...deployment,txId:"0x"+"b".repeat(64)},
    {...deployment,transaction:{...tx,data:tx.data.slice(0,-2)+"ff"}},
    {...deployment,transaction:{...tx,gasLimit:"0x340000"}},
    {...deployment,transaction:{...tx,to:"0x"+"2".repeat(40)}},
  ]) {
    const p=wallet(); await assert.rejects(submit(p,deployment,async()=>d)); neverSent(p);
  }
  const p=wallet(); await assert.rejects(submit(p,deployment,async()=>{throw new Error("File unavailable");}),/File unavailable/); neverSent(p);
});
test("source mutation during checks and wallet changes block submission", async () => {
  const d=structuredClone(deployment), pristine=structuredClone(deployment), p=wallet();
  await assert.rejects(submit(p,d,async()=>{d.transaction.data="0x1234";return pristine;}),/reviewed transaction changed/); neverSent(p);
  const q=wallet(); await assert.rejects(submit(q,deployment,async()=>deployment,()=>false),/Wallet or network changed/); neverSent(q);
  let n=0;const changed=wallet({eth_chainId:()=>++n===1?"0x14a34":"0x1"});
  await assert.rejects(submit(changed)); neverSent(changed);
});
test("wallet rejection is surfaced without retry", async () => {
  const p=wallet({eth_sendTransaction:new Error("User rejected request")});
  await assert.rejects(submit(p),/User rejected/);
  assert.equal(p.calls.filter(c=>c.method==="eth_sendTransaction").length,1);
});
test("current-preparation endpoint is local-development-only and uncached", async () => {
  const route=load("app/admin/brickken/deploy/current/route.ts"), old=process.env.NODE_ENV;
  try {
    process.env.NODE_ENV="production";
    assert.equal((await route.GET(new Request("http://localhost/current",{headers:{host:"localhost"}}))).status,404);
    process.env.NODE_ENV="development";
    for(const headers of [{host:"example.com"},{host:"localhost","sec-fetch-site":"cross-site"}])
      assert.equal((await route.GET(new Request("http://localhost/current",{headers}))).status,404);
    const response=await route.GET(new Request("http://localhost/current",{headers:{host:"localhost"}}));
    assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"no-store");
    assert.equal((await response.json()).txId,deployment.txId);
  } finally {if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}
});

