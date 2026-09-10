# Participant campaigns and redemptions

Apply supabase/migrations/20260911_participant_redemptions.sql after the existing sponsor campaign migration. This migration has not been applied to Supabase by this task. It is transactional and intended to be applied once.

New table: redemptions (id, user_id, campaign_id, request_id, amount_bkne, redemption_type, destination, euro_value, conversion_bkne_per_eur, status, created_at). Unique (user_id, request_id) supplies request idempotency. New campaign column: redemption_bkne_per_eur, nullable. An admin sets it on /admin/campaigns/[id], for example 100 BKNE per EUR. There is no default or market exchange rate. Existing redemption requests retain the server-calculated conversion snapshot.

Participant UI:
- My campaigns on the dashboard and /challenges includes joined/finished memberships and paused/completed campaigns, but hides drafts and left memberships.
- Available campaigns is a separate list, excluding My campaigns.
- Progress means recorded activity count, rewarded activity count, distance, active minutes and steps; no campaign goal is invented.
- /rewards shows recorded earned rewards, pending, distributed and available balance. Earned includes pending/processing/failed reward allocations; these cannot be redeemed.
- Activity detail names the campaign stored on the reward record and shows the recorded reward amount.

Accounting:
Available per campaign = distributed rewards for Johan minus all non-hold redemption amounts for Johan and that campaign. All requested/processing/completed/failed redemption rows retain this commitment. There is no automatic refund or status-changing endpoint. Unlinked legacy rewards are not redeemable until reconciled with a campaign. Campaign reward budgets are not deducted again during redemption.

request_demo_redemption resolves Johan from demo_participant, takes a participant-wide transaction advisory lock, verifies the request ID and full payload, reads distributed credits, subtracts prior commitments, validates the campaign conversion/destination, and inserts one requested row. The transaction prevents overspending across requests with different IDs; UNIQUE and payload comparison make exact retries return the existing row. The browser never supplies identity, euro value or available balance. Direct public/service-role writes to redemptions are denied; only the server-only RPC can create requests.

Keep BKNE records a requested preference but does not reduce available balance. All other options require a configured campaign value. Only one campaign funds each request. EUR values round to cents, and values rounding to zero are refused. Conversion updates do not change existing requests.

Mocked: cash payout, charities, partner vouchers, race entry and gym contribution. No bank details are collected. No payment, webshop, OAuth or Brickken call occurs. demoRedemptionProvider is an uncalled not_connected fulfillment boundary; real fulfillment requires idempotent provider execution and confirmation/refund reconciliation. Local-development access guards remain in effect; this is not production user authentication.

Files changed:
- app/page.tsx
- app/challenges/page.tsx
- app/rewards/page.tsx
- app/admin/campaigns/[id]/page.tsx
- src/components/campaigns/MyCampaigns.tsx
- src/components/campaigns/AvailableChallenges.tsx
- src/components/redemptions/ConversionSetting.tsx
- src/components/redemptions/RedemptionForm.tsx
- src/components/rewards/ActivityRewardStatus.tsx
- src/lib/campaigns/participantVisibility.ts
- src/lib/campaigns/sponsorQueries.ts
- src/lib/redemptions/types.ts
- src/lib/redemptions/queries.ts
- src/lib/redemptions/validation.ts
- src/lib/redemptions/actions.ts
- src/lib/redemptions/demoProvider.ts
- supabase/migrations/20260911_participant_redemptions.sql
- tests/participant-redemptions.test.mjs
- tests/sponsor-campaigns.test.mjs
- docs/participant-redemptions.md

Tests use disposable PGlite, not Supabase. Concurrent submissions in that runtime are queued: they validate transaction outcomes and idempotency, not independent database connections under load.
