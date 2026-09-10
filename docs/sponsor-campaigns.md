# Sponsor campaigns: local demo

Apply supabase/migrations/20260910_sponsor_campaigns.sql in Supabase SQL Editor as the database owner after all existing 20260908 migrations and 20260909_campaign_budget_reconciliation.sql. The migration is transactional and intended for one application. It has not been applied by this coding task.

New tables:
- organisations: id, name, type, created_at; three demo organisations seeded.
- campaign_participants: id, campaign_id, user_id, joined_at, status; unique campaign/user pair.
- demo_participant: one server-only identity mapping to the existing activity owner. The migration fails rather than choosing a user if existing activities have multiple owners or no owner.

Campaign columns: organisation_id, description, start_date/end_date if absent, audience, max_reward_per_participant, max_reward_per_day, and token_symbol if absent. Existing campaigns without an organisation are assigned to BKNergy Demo Employer. Existing activity and reward campaign links and amounts stay unchanged. Existing explicitly assigned activity owners are enrolled to preserve their workflow.

Routes:
- /admin/campaigns: overview with participants, reserved rewards and budget integrity.
- /admin/campaigns/new: create a draft or active campaign with 1–4 rules in one transaction.
- /admin/campaigns/[id]: details and draft publication/status controls.
- /challenges: open active campaigns available to Johan, with Join/Joined.
- /activities/[id]: assign demo activities to joined campaigns with a matching activity rule. Activities with any existing reward cannot be reassigned.

All reads using the admin client and all mutations remain restricted to the local development demo. This is not production authentication. The client does not choose Johan's identity. Joining resolves the singleton demo identity in SQL, locks the campaign, checks status/dates/audience, and upserts the unique participation record. Public and community audiences permit self-join; employees/invite_only require already established active participation. No employee verification or invitation UI is implemented.

Rules: distance_km is proportional. active_minutes uses normalized demo durationSeconds / 60, preserving existing duration_minutes behavior. Steps and activity_count use completed threshold blocks. Every result is rounded down to whole BKNE; legacy duration_minutes rules still work. A rule cap limits each activity. Optional campaign caps apply per participant across all reserved rewards and per UTC reservation day. Exceeding a campaign participant cap refuses the entire reward, rather than partially awarding it.

reserve_activity_reward retains activity and campaign locks, verification checks, unique activity reward protection, insert-on-conflict handling and atomic deduction. It additionally checks active participation, dates, new metrics and participant caps. Pending, processing, distributed and failed all retain reservations. Distribution/reconciliation functions are unchanged.

The reward pool is a simulated allocation, not evidence of real funding. Organisation ownership and pool/rule records provide the future sponsor funding reference. A real funding ledger, confirmation checks and authenticated roles must be added before live funding. No Brickken call, fiat payment, OAuth or credential integration is present. Future transfers remain at src/lib/brickken/distributeReward.ts.

Validation: node --test tests/*.test.mjs; npm run build; npx tsc --noEmit; npm run lint. Database tests use the disposable PGlite runtime already installed under work/budget-test-runtime. These tests do not modify Supabase; queued database requests are not a multi-connection load test.

Files added/changed for this feature:
- app/admin/campaigns/page.tsx
- app/admin/campaigns/new/page.tsx
- app/admin/campaigns/[id]/page.tsx
- app/challenges/page.tsx
- app/page.tsx
- app/activities/[id]/page.tsx
- src/components/campaigns/ActivityCampaignSelector.tsx
- src/components/campaigns/AvailableChallenges.tsx
- src/components/campaigns/CampaignBudgetSummary.tsx
- src/components/campaigns/CampaignCommandForm.tsx
- src/components/campaigns/CampaignLaunchForm.tsx
- src/lib/campaigns/launchActions.ts
- src/lib/campaigns/launchValidation.ts
- src/lib/campaigns/sponsorQueries.ts
- src/lib/campaigns/types.ts
- src/lib/rewards/calculateReward.ts
- supabase/migrations/20260910_sponsor_campaigns.sql
- tests/sponsor-campaigns.test.mjs
- docs/sponsor-campaigns.md
