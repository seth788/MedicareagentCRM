-- Scope of Appointment (SOA) electronic signing workflow
-- CMS compliance: signed SOA required before Medicare sales appointments

CREATE TABLE public.scope_of_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'opened', 'client_signed', 'completed', 'expired', 'voided')),

  -- Delivery
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'sms', 'print', 'face_to_face')),
  secure_token UUID NOT NULL DEFAULT gen_random_uuid(),
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Language
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'es')),

  -- Product pre-selections by agent (client can modify these when signing)
  products_preselected JSONB DEFAULT '[]',
  -- Final product selections by client
  products_selected JSONB DEFAULT '[]',
  -- Expected format: ["part_d", "part_c", "dental_vision_hearing", "hospital_indemnity", "medigap"]

  -- Client signature data
  signer_type TEXT CHECK (signer_type IN ('beneficiary', 'representative')),
  client_typed_signature TEXT,
  client_signed_at TIMESTAMPTZ,
  client_ip_address INET,
  client_user_agent TEXT,

  -- Representative info (if signer_type = 'representative')
  rep_name TEXT,
  rep_relationship TEXT,

  -- Agent info (snapshot at time of creation, in case agent profile changes later)
  agent_name TEXT NOT NULL,
  agent_phone TEXT,
  agent_npn TEXT,

  -- Beneficiary info (snapshot from client record at time of creation)
  beneficiary_name TEXT NOT NULL,
  beneficiary_phone TEXT,
  beneficiary_address TEXT,

  -- Agent countersign data
  agent_typed_signature TEXT,
  agent_signed_at TIMESTAMPTZ,

  -- Appointment details (agent fills some at creation, can update at countersign)
  initial_contact_method TEXT,
  plans_represented TEXT,
  appointment_date DATE,  -- Intentionally nullable — agent may not know this at creation time

  -- Carrier template info
  carrier_template TEXT DEFAULT 'generic',

  -- Final signed PDF
  signed_pdf_path TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for token lookups (the public signing page queries by token)
CREATE UNIQUE INDEX idx_soa_secure_token ON public.scope_of_appointments(secure_token);

-- Index for agent dashboard queries
CREATE INDEX idx_soa_agent_status ON public.scope_of_appointments(agent_id, status);

-- Index for client profile queries (all SOAs for a given client)
CREATE INDEX idx_soa_client_id ON public.scope_of_appointments(client_id);

-- RLS: agents can only see their own SOAs
ALTER TABLE public.scope_of_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see own SOAs" ON public.scope_of_appointments
  FOR ALL USING (agent_id = auth.uid());

-- SOA audit log: tracks all actions for compliance
CREATE TABLE public.soa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soa_id UUID NOT NULL REFERENCES public.scope_of_appointments(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  -- Actions: 'created', 'sent', 'delivery_failed', 'opened', 'client_signed', 'agent_countersigned', 'pdf_generated', 'edited', 'voided', 'expired', 'resent'
  performed_by TEXT, -- agent UUID or 'client' or 'system'
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_soa_audit_soa_id ON public.soa_audit_log(soa_id);

ALTER TABLE public.soa_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents see audit logs for own SOAs" ON public.soa_audit_log
  FOR SELECT USING (
    soa_id IN (SELECT id FROM public.scope_of_appointments WHERE agent_id = auth.uid())
  );
