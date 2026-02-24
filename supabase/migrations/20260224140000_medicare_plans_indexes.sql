-- Indexes for fast medicare_plans lookups by plan_type, state, county (and carrier for plans).
-- Table medicare_plans is assumed to exist with columns: plan_type, state, county, org_marketing_name, etc.

create index if not exists idx_medicare_plans_plan_type_state_county
  on public.medicare_plans (plan_type, state, county);

create index if not exists idx_medicare_plans_plan_type_state_county_carrier
  on public.medicare_plans (plan_type, state, county, org_marketing_name);
