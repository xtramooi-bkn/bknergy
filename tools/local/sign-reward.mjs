import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Wallet, getAddress } from "ethers";

const CHAIN_ID = 84532;
const TREASURY = "0x8EF9922dCAE0561cDA8d6908fCe3526DA25b25b1";
const TOKEN = "0xb83aaa1cbfa200be6970E6301C62769D0495836d";
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const TX_ID = /^0x[0-9a-fA-F]{64}$/;

function hiddenQuestion(prompt) { return new Promise((resolve) => { const stdin = process.stdin; let value = ""; process.stdout.write(prompt); if (!stdin.isTTY) throw new Error("A TTY is required to enter the treasury private key."); stdin.setRawMode(true); stdin.resume(); stdin.setEncoding("utf8"); const onData = (character) => { if (character === "\r" || character === "\n") { stdin.setRawMode(false); stdin.pause(); stdin.removeListener("data", onData); process.stdout.write("\n"); resolve(value); return; } if (character === "\u0003") process.exit(130); if (character === "\u007f" || character === "\b") { value = value.slice(0, -1); return; } value += character; }; stdin.on("data", onData); }); }
const same = (a, b) => typeof a === "string" && a.toLowerCase() === b.toLowerCase();
function fail(message) { throw new Error(`Invalid signing package: ${message}`); }
function validate(pkg) {
  if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) fail("package must be an object");
  const keys = ["rewardId","amount","tokenSymbol","tokenContract","network","chainId","brickkenTransactionId","expectedSigner","recipientWallet","transactions"];
  if (keys.some((key) => !(key in pkg))) fail("missing required field");
  if (!Number.isSafeInteger(pkg.amount) || pkg.amount <= 0) fail("amount must be a positive integer");
  if (pkg.chainId !== CHAIN_ID || pkg.network !== "Base Sepolia") fail("wrong network or chain ID");
  if (pkg.tokenSymbol !== "BKNE" || !same(pkg.tokenContract, TOKEN)) fail("wrong token contract");
  if (!same(pkg.expectedSigner, TREASURY) || !ADDRESS.test(pkg.expectedSigner)) fail("wrong expected signer");
  if (!ADDRESS.test(pkg.recipientWallet) || !TX_ID.test(pkg.brickkenTransactionId)) fail("recipient or Brickken transaction ID is malformed");
  if (!Array.isArray(pkg.transactions) || pkg.transactions.length !== 1) fail("exactly one prepared transaction is required");
  const tx = pkg.transactions[0]; if (!tx || typeof tx !== "object") fail("transaction is malformed");
  if (!same(tx.from, TREASURY) || !same(tx.to, TOKEN) || Number(tx.chainId) !== CHAIN_ID) fail("transaction sender, recipient, or chain does not match");
  if (tx.value !== undefined && BigInt(tx.value) !== 0n) fail("ERC20 transfer must have zero value");
  if (typeof tx.data !== "string" || !/^0xa9059cbb[0-9a-fA-F]{128}$/.test(tx.data)) fail("transaction is not one ERC20 transfer");
  const encodedRecipient = `0x${tx.data.slice(34, 74)}`; const encodedAmount = BigInt(`0x${tx.data.slice(74, 138)}`);
  if (!same(encodedRecipient, pkg.recipientWallet)) fail("encoded recipient does not match package recipient");
  if (encodedAmount !== BigInt(pkg.amount) * 10n ** 18n) fail("encoded BKNE amount does not match package amount");
  for (const key of ["nonce","gasLimit","maxFeePerGas","maxPriorityFeePerGas","data","chainId","value","type","to"]) if (tx[key] === undefined) fail(`transaction is missing ${key}`);
  return tx;
}

const input = process.argv[2]; if (!input) throw new Error("Usage: node tools/local/sign-reward.mjs <preparation-json>");
let pkg; try { pkg = JSON.parse(fs.readFileSync(input, "utf8")); } catch { throw new Error("Unable to read preparation JSON."); }
const tx = validate(pkg); let privateKey = await hiddenQuestion("Treasury private key: "); if (!privateKey.startsWith("0x")) privateKey = `0x${privateKey}`;
let wallet; try { wallet = new Wallet(privateKey); } finally { privateKey = ""; }
if (!same(getAddress(wallet.address), TREASURY)) throw new Error(`Wrong treasury wallet: ${wallet.address}`);
const signed = await wallet.signTransaction({ to: tx.to, nonce: tx.nonce, chainId: tx.chainId, data: tx.data, value: BigInt(tx.value), type: tx.type, gasLimit: BigInt(tx.gasLimit), maxFeePerGas: BigInt(tx.maxFeePerGas), maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas) });
const output = path.resolve("outputs", `bkne-reward-${pkg.amount}-signed.txt`); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, signed, { encoding: "utf8", mode: 0o600 });
console.log(`Amount: ${pkg.amount} BKNE\nRecipient: ${pkg.recipientWallet}\nSigner: ${wallet.address}\nBrickken txId: ${pkg.brickkenTransactionId}\nOutput: ${output}\nNothing has been broadcast.`);
