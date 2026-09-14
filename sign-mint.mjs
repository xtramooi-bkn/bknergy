import fs from "fs";
import { Wallet } from "ethers";

const EXPECTED_SIGNER =
  "0xE95900Ca65EF152a5D9FEe1c61b71bBeD00dFcF6";

const EXPECTED_TXID =
  "0x594ba4e6b3c5f0d957f69a6e602d231c427a4763ac9d4a59fa88867d48186aa1";

const INPUT =
  "C:/bknergy/outputs/bkne-mint-client-signed.json";

const OUTPUT =
  "C:/bknergy/outputs/bkne-mint-signed.txt";

function hiddenQuestion(prompt) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";

    function onData(char) {
      if (char === "\r" || char === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolve(value);
        return;
      }

      if (char === "\u0003") process.exit();

      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }

      value += char;
    }

    stdin.on("data", onData);
  });
}

const preparation = JSON.parse(fs.readFileSync(INPUT, "utf8"));

if (preparation.txId !== EXPECTED_TXID) {
  throw new Error("Unexpected Brickken txId");
}

const tx = Array.isArray(preparation.transactions)
  ? preparation.transactions[0]
  : preparation.transactions;

if (!tx) throw new Error("No prepared mint transaction found");

if (tx.from.toLowerCase() !== EXPECTED_SIGNER.toLowerCase()) {
  throw new Error("Unexpected signer");
}

if (Number(tx.chainId) !== 84532) {
  throw new Error("Unexpected chain");
}

if (Number(tx.nonce) !== 4) {
  throw new Error("Unexpected nonce");
}

if (tx.value !== "0x00") {
  throw new Error("Unexpected transaction value");
}

let privateKey = await hiddenQuestion(
  "Private key for tokenizer wallet: "
);

if (!privateKey.startsWith("0x")) {
  privateKey = "0x" + privateKey;
}

const wallet = new Wallet(privateKey);

if (wallet.address.toLowerCase() !== EXPECTED_SIGNER.toLowerCase()) {
  privateKey = "";
  throw new Error(`Wrong wallet: ${wallet.address}`);
}

const signedTransaction = await wallet.signTransaction({
  to: tx.to,
  nonce: Number(tx.nonce),
  chainId: Number(tx.chainId),
  data: tx.data,
  value: BigInt(tx.value),
  type: Number(tx.type),
  gasLimit: BigInt(tx.gasLimit),
  maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas),
  maxFeePerGas: BigInt(tx.maxFeePerGas),
});

privateKey = "";

fs.writeFileSync(OUTPUT, signedTransaction, "utf8");

console.log("Mint transaction signed successfully.");
console.log("Signer:", wallet.address);
console.log("Brickken txId:", preparation.txId);
console.log("Signed transaction saved to:");
console.log(OUTPUT);
console.log("Nothing has been broadcast.");