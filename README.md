# BKNergy

**BKNergy transforms verified healthy behaviour into programmable tokenized rewards.**

Healthy behaviour creates value but is rarely directly rewarded. BKNergy turns verified activities into campaign-funded BKNE rewards for employers, governments, insurers, and sports or health brands.

## How it works

Activity → Verification → Campaign rule → Reward reservation → BKNE distribution through Brickken → Participant wallet → future redemption, donation, or spend concept.

Brickken provides the tokenization infrastructure used to issue and distribute tokenized rewards.

## Working proof

- BKNE is deployed on Base Sepolia, with 10,000 BKNE minted to the treasury.
- Participant whitelisting works and real BKNE rewards have been transferred on-chain.
- BKNergy reconciles on-chain state back into reward state.

## Architecture

Tokenizer/Admin → Treasury → Participant

The app uses Next.js, TypeScript, React, Supabase/Postgres, Brickken Sandbox API, and Base Sepolia.

## Security and reward operations

Private keys never enter the web app. The Brickken API key is server-only. Reward reservation, atomic submission claims, duplicate-payout protection, and recovery/reconciliation controls are retained in the distribution flow. Treasury signing is external and local: download a prepared package from local `/admin/rewards`, then run:

```bash
node tools/local/sign-reward.mjs outputs/bknergy-reward-81-preparation.json
```

The signer validates the exact Base Sepolia BKNE transfer and writes a raw signed transaction locally. It never broadcasts or stores a private key.

## Local setup

Install dependencies, configure the environment names below locally, run the required existing Supabase migrations, then use `npm run dev`. Admin distribution controls are intentionally local-development only and are unavailable in production.

Required environment variable names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `BRICKKEN_SANDBOX_API_BASE_URL`
- `BRICKKEN_SANDBOX_API_KEY`
- `BRICKKEN_BASE_SEPOLIA_RPC_URL` (optional for treasury balance; required for historical reconciliation)

Named sponsor and campaign examples are concepts/demos unless explicitly stated otherwise. They do not imply a confirmed commercial partnership.