-- Preset flow templates (read-only for agents; used to create new flows from template)
create table if not exists public.flow_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.flow_template_stages (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.flow_templates(id) on delete cascade,
  name text not null,
  color text not null,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_flow_template_stages_template_id on public.flow_template_stages(template_id);

alter table public.flow_templates enable row level security;
alter table public.flow_template_stages enable row level security;

-- Read-only for authenticated users (templates are seed/admin data)
create policy "Authenticated users can read flow_templates"
  on public.flow_templates for select
  to authenticated
  using (true);

create policy "Authenticated users can read flow_template_stages"
  on public.flow_template_stages for select
  to authenticated
  using (true);

-- No insert/update/delete policies for regular users; only seed/migrations or service role can write

-- Clear existing template stages for idempotent re-runs (template IDs used below)
delete from public.flow_template_stages
where template_id in (
  'a0000001-4000-4000-8000-000000000001', 'a0000001-4000-4000-8000-000000000002',
  'a0000001-4000-4000-8000-000000000003', 'a0000001-4000-4000-8000-000000000004',
  'a0000001-4000-4000-8000-000000000005', 'a0000001-4000-4000-8000-000000000006',
  'a0000001-4000-4000-8000-000000000007', 'a0000001-4000-4000-8000-000000000008',
  'a0000001-4000-4000-8000-000000000009'
);

-- Seed: preset templates and stages (fixed UUIDs for idempotent re-runs)
insert into public.flow_templates (id, name, description, category, sort_order) values
  ('a0000001-4000-4000-8000-000000000001', 'New Lead Pipeline', 'Track prospects from first contact through enrollment.', 'Sales', 1),
  ('a0000001-4000-4000-8000-000000000002', 'AEP Client Review', 'Manage clients through the Annual Enrollment Period review process.', 'Seasonal', 2),
  ('a0000001-4000-4000-8000-000000000003', 'OEP Follow-Up', 'Track clients needing plan changes during the Open Enrollment Period.', 'Seasonal', 3),
  ('a0000001-4000-4000-8000-000000000004', 'New-to-Medicare (T65)', 'Guide turning-65 clients through the Medicare onboarding journey.', 'Sales', 4),
  ('a0000001-4000-4000-8000-000000000005', 'Special Enrollment Period (SEP)', 'Manage clients qualifying for a Special Enrollment Period.', 'Sales', 5),
  ('a0000001-4000-4000-8000-000000000006', 'Client Retention / Annual Check-In', 'Stay on top of yearly client reviews to maintain your book of business.', 'Retention', 6),
  ('a0000001-4000-4000-8000-000000000007', 'Service Request', 'Track and resolve client service issues in a structured way.', 'Service', 7),
  ('a0000001-4000-4000-8000-000000000008', 'Referral Pipeline', 'Track referrals from receipt through enrollment and follow-up.', 'Sales', 8),
  ('a0000001-4000-4000-8000-000000000009', 'Lead Re-Engagement (Aged Leads)', 'Work through older leads to find new opportunities.', 'Sales', 9)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  sort_order = excluded.sort_order;

-- Template 1: New Lead Pipeline
insert into public.flow_template_stages (template_id, name, color, sort_order) values
  ('a0000001-4000-4000-8000-000000000001', 'New Lead', '#EF4444', 1),
  ('a0000001-4000-4000-8000-000000000001', 'Contact Attempted', '#EAB308', 2),
  ('a0000001-4000-4000-8000-000000000001', 'Contacted', '#06B6D4', 3),
  ('a0000001-4000-4000-8000-000000000001', 'Needs Assessment', '#A855F7', 4),
  ('a0000001-4000-4000-8000-000000000001', 'Quoting', '#3B82F6', 5),
  ('a0000001-4000-4000-8000-000000000001', 'Application Submitted', '#EC4899', 6),
  ('a0000001-4000-4000-8000-000000000001', 'Enrolled', '#22C55E', 7),
  ('a0000001-4000-4000-8000-000000000001', 'Lost / Not Interested', '#374151', 8);

-- Template 2: AEP Client Review
insert into public.flow_template_stages (template_id, name, color, sort_order) values
  ('a0000001-4000-4000-8000-000000000002', 'Needs Review', '#EF4444', 1),
  ('a0000001-4000-4000-8000-000000000002', 'Review Scheduled', '#EAB308', 2),
  ('a0000001-4000-4000-8000-000000000002', 'Plan Options Prepared', '#A855F7', 3),
  ('a0000001-4000-4000-8000-000000000002', 'Options Presented', '#3B82F6', 4),
  ('a0000001-4000-4000-8000-000000000002', 'Ready to Enroll', '#06B6D4', 5),
  ('a0000001-4000-4000-8000-000000000002', 'Enrolled', '#22C55E', 6),
  ('a0000001-4000-4000-8000-000000000002', 'Confirmation Sent', '#EC4899', 7),
  ('a0000001-4000-4000-8000-000000000002', 'No Change Needed', '#374151', 8);

-- Template 3: OEP Follow-Up
insert into public.flow_template_stages (template_id, name, color, sort_order) values
  ('a0000001-4000-4000-8000-000000000003', 'Identified for OEP', '#EF4444', 1),
  ('a0000001-4000-4000-8000-000000000003', 'Contacted', '#06B6D4', 2),
  ('a0000001-4000-4000-8000-000000000003', 'Reviewing Options', '#A855F7', 3),
  ('a0000001-4000-4000-8000-000000000003', 'Plan Change Submitted', '#3B82F6', 4),
  ('a0000001-4000-4000-8000-000000000003', 'Completed', '#22C55E', 5),
  ('a0000001-4000-4000-8000-000000000003', 'No Action Taken', '#374151', 6);

-- Template 4: New-to-Medicare (T65)
insert into public.flow_template_stages (template_id, name, color, sort_order) values
  ('a0000001-4000-4000-8000-000000000004', 'Turning 65 Lead', '#EF4444', 1),
  ('a0000001-4000-4000-8000-000000000004', 'Initial Contact', '#06B6D4', 2),
  ('a0000001-4000-4000-8000-000000000004', 'Education Call Scheduled', '#EAB308', 3),
  ('a0000001-4000-4000-8000-000000000004', 'Parts A & B Confirmed', '#A855F7', 4),
  ('a0000001-4000-4000-8000-000000000004', 'Plan Recommendation', '#3B82F6', 5),
  ('a0000001-4000-4000-8000-000000000004', 'Application Submitted', '#EC4899', 6),
  ('a0000001-4000-4000-8000-000000000004', 'Welcome Package Sent', '#22C55E', 7),
  ('a0000001-4000-4000-8000-000000000004', 'Lost / Not Interested', '#374151', 8);

-- Template 5: SEP
insert into public.flow_template_stages (template_id, name, color, sort_order) values
  ('a0000001-4000-4000-8000-000000000005', 'SEP Identified', '#EF4444', 1),
  ('a0000001-4000-4000-8000-000000000005', 'Eligibility Verified', '#A855F7', 2),
  ('a0000001-4000-4000-8000-000000000005', 'Options Reviewed', '#3B82F6', 3),
  ('a0000001-4000-4000-8000-000000000005', 'Application Submitted', '#EC4899', 4),
  ('a0000001-4000-4000-8000-000000000005', 'Enrolled', '#22C55E', 5),
  ('a0000001-4000-4000-8000-000000000005', 'Not Eligible', '#374151', 6);

-- Template 6: Client Retention / Annual Check-In
insert into public.flow_template_stages (template_id, name, color, sort_order) values
  ('a0000001-4000-4000-8000-000000000006', 'Due for Check-In', '#EF4444', 1),
  ('a0000001-4000-4000-8000-000000000006', 'Outreach Attempted', '#EAB308', 2),
  ('a0000001-4000-4000-8000-000000000006', 'Check-In Scheduled', '#06B6D4', 3),
  ('a0000001-4000-4000-8000-000000000006', 'Review Completed', '#A855F7', 4),
  ('a0000001-4000-4000-8000-000000000006', 'Staying on Plan', '#22C55E', 5),
  ('a0000001-4000-4000-8000-000000000006', 'Plan Change Needed', '#3B82F6', 6),
  ('a0000001-4000-4000-8000-000000000006', 'Unresponsive', '#374151', 7);

-- Template 7: Service Request
insert into public.flow_template_stages (template_id, name, color, sort_order) values
  ('a0000001-4000-4000-8000-000000000007', 'Request Received', '#EF4444', 1),
  ('a0000001-4000-4000-8000-000000000007', 'In Progress', '#3B82F6', 2),
  ('a0000001-4000-4000-8000-000000000007', 'Waiting on Client', '#EAB308', 3),
  ('a0000001-4000-4000-8000-000000000007', 'Waiting on Carrier', '#A855F7', 4),
  ('a0000001-4000-4000-8000-000000000007', 'Resolved', '#22C55E', 5);

-- Template 8: Referral Pipeline
insert into public.flow_template_stages (template_id, name, color, sort_order) values
  ('a0000001-4000-4000-8000-000000000008', 'Referral Received', '#EC4899', 1),
  ('a0000001-4000-4000-8000-000000000008', 'Initial Contact', '#06B6D4', 2),
  ('a0000001-4000-4000-8000-000000000008', 'Appointment Set', '#EAB308', 3),
  ('a0000001-4000-4000-8000-000000000008', 'Quoted', '#3B82F6', 4),
  ('a0000001-4000-4000-8000-000000000008', 'Enrolled', '#22C55E', 5),
  ('a0000001-4000-4000-8000-000000000008', 'Thank You Sent', '#A855F7', 6),
  ('a0000001-4000-4000-8000-000000000008', 'Lost / Not Interested', '#374151', 7);

-- Template 9: Lead Re-Engagement (Aged Leads)
insert into public.flow_template_stages (template_id, name, color, sort_order) values
  ('a0000001-4000-4000-8000-000000000009', 'Aged Lead Identified', '#EF4444', 1),
  ('a0000001-4000-4000-8000-000000000009', 'Re-Contact Attempted', '#EAB308', 2),
  ('a0000001-4000-4000-8000-000000000009', 'Reached', '#06B6D4', 3),
  ('a0000001-4000-4000-8000-000000000009', 'Re-Qualified', '#A855F7', 4),
  ('a0000001-4000-4000-8000-000000000009', 'Quoting', '#3B82F6', 5),
  ('a0000001-4000-4000-8000-000000000009', 'Enrolled', '#22C55E', 6),
  ('a0000001-4000-4000-8000-000000000009', 'Unresponsive', '#374151', 7);
