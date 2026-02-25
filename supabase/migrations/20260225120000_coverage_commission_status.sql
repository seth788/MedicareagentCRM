-- Add commission_status to client_coverages for pending/issued tracking
alter table public.client_coverages
  add column if not exists commission_status text not null default 'not_paid'
  check (commission_status in ('paid_full', 'partial', 'trued_up', 'not_paid', 'chargeback'));

-- Index on status for efficient pending vs. issued filtering
create index if not exists idx_client_coverages_status on public.client_coverages(status);
