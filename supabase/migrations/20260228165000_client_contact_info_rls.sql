-- Street-level agents: agency sees reports only. Restrict contact info (phones, emails, addresses) to full-access.
-- can_manage_client: allows SELECT on clients (report view)
-- can_view_client_contact_info: required for SELECT on contact tables + for UPDATE/DELETE on clients

-- Clients: SELECT for can_manage_client; INSERT/UPDATE/DELETE for own client OR can_view_client_contact_info
DROP POLICY IF EXISTS "Agents and agency book users can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Agents and agency book users can select clients" ON public.clients;
DROP POLICY IF EXISTS "Agents and agency book users with full access can modify clients" ON public.clients;
DROP POLICY IF EXISTS "Agents and agency book users with full access can update delete clients" ON public.clients;
DROP POLICY IF EXISTS "Agents and agency book users with full access can delete clients" ON public.clients;
CREATE POLICY "Agents and agency book users can select clients"
  ON public.clients FOR SELECT
  USING (public.can_manage_client(agent_id));

CREATE POLICY "Agents and agency book users with full access can modify clients"
  ON public.clients FOR INSERT
  WITH CHECK (
    auth.uid() = agent_id
    OR public.can_view_client_contact_info(agent_id)
  );

CREATE POLICY "Agents and agency book users with full access can update delete clients"
  ON public.clients FOR UPDATE
  USING (
    auth.uid() = agent_id
    OR public.can_view_client_contact_info(agent_id)
  )
  WITH CHECK (
    auth.uid() = agent_id
    OR public.can_view_client_contact_info(agent_id)
  );

CREATE POLICY "Agents and agency book users with full access can delete clients"
  ON public.clients FOR DELETE
  USING (
    auth.uid() = agent_id
    OR public.can_view_client_contact_info(agent_id)
  );

-- Contact tables: require can_view_client_contact_info for SELECT (street-level gets empty)
DROP POLICY IF EXISTS "Agents and agency book users can manage phones" ON public.client_phones;
DROP POLICY IF EXISTS "Full access can manage phones" ON public.client_phones;
CREATE POLICY "Full access can manage phones"
  ON public.client_phones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id AND public.can_view_client_contact_info(c.agent_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id AND public.can_view_client_contact_info(c.agent_id)
    )
  );

DROP POLICY IF EXISTS "Agents and agency book users can manage emails" ON public.client_emails;
DROP POLICY IF EXISTS "Full access can manage emails" ON public.client_emails;
CREATE POLICY "Full access can manage emails"
  ON public.client_emails FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id AND public.can_view_client_contact_info(c.agent_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id AND public.can_view_client_contact_info(c.agent_id)
    )
  );

DROP POLICY IF EXISTS "Agents and agency book users can manage addresses" ON public.client_addresses;
DROP POLICY IF EXISTS "Full access can manage addresses" ON public.client_addresses;
CREATE POLICY "Full access can manage addresses"
  ON public.client_addresses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id AND public.can_view_client_contact_info(c.agent_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id AND public.can_view_client_contact_info(c.agent_id)
    )
  );
