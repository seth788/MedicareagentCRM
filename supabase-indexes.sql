-- MediCRM Performance Indexes
-- Run this file manually in the Supabase SQL Editor after reviewing.
-- These indexes support the query patterns used in lib/db (agent_id filters, client_id lookups, and ordering).

-- Clients: filtered by agent_id, ordered by created_at
CREATE INDEX IF NOT EXISTS idx_clients_agent_id ON clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_clients_agent_created ON clients(agent_id, created_at DESC);

-- Leads: filtered by agent_id, ordered by created_at; updates/deletes by id + agent_id
CREATE INDEX IF NOT EXISTS idx_leads_agent_id ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_agent_created ON leads(agent_id, created_at DESC);

-- Activities: filtered by agent_id, ordered by created_at
CREATE INDEX IF NOT EXISTS idx_activities_agent_id ON activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_activities_agent_created ON activities(agent_id, created_at DESC);

-- Tasks: filtered by agent_id, ordered by due_date
CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_due ON tasks(agent_id, due_date ASC);

-- Flows: filtered by agent_id, ordered by order
CREATE INDEX IF NOT EXISTS idx_flows_agent_id ON flows(agent_id);
CREATE INDEX IF NOT EXISTS idx_flows_agent_order ON flows(agent_id, "order" ASC);

-- Stages: filtered by flow_id (IN list), ordered by order
CREATE INDEX IF NOT EXISTS idx_stages_flow_id ON stages(flow_id);
CREATE INDEX IF NOT EXISTS idx_stages_flow_order ON stages(flow_id, "order" ASC);

-- Client relation tables: lookups by client_id (fetchClients, updateClient)
CREATE INDEX IF NOT EXISTS idx_client_phones_client_id ON client_phones(client_id);
CREATE INDEX IF NOT EXISTS idx_client_emails_client_id ON client_emails(client_id);
CREATE INDEX IF NOT EXISTS idx_client_addresses_client_id ON client_addresses(client_id);
CREATE INDEX IF NOT EXISTS idx_client_doctors_client_id ON client_doctors(client_id);
CREATE INDEX IF NOT EXISTS idx_client_medications_client_id ON client_medications(client_id);
CREATE INDEX IF NOT EXISTS idx_client_pharmacies_client_id ON client_pharmacies(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_coverage_client_id ON client_coverage(client_id);

-- Agent custom sources: filtered by agent_id, ordered by source
CREATE INDEX IF NOT EXISTS idx_agent_custom_sources_agent_id ON agent_custom_sources(agent_id);
