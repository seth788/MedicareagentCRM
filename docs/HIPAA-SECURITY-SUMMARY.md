# HIPAA Compliance & Security – Implementation Summary

This document summarizes changes made for MBI (Medicare number) encryption, RLS, PHI access logging, and security hardening. It also lists manual steps you need to complete.

---

## 1. Changes Made

### Encryption at rest (MBI)

- **`lib/encryption.ts`** – AES-256-CBC encrypt/decrypt with 32-byte key from `ENCRYPTION_KEY`. Each value uses a unique random IV; format stored in DB: `ivHex:base64Ciphertext`. Exports: `encrypt()`, `decrypt()`, `isEncrypted()`.
- **`lib/db/clients.ts`** – All reads of `medicare_number` no longer return the value to the client: `fetchClients` selects `has_medicare_number` (generated column) and sets `medicareNumber: ""` and `hasMedicareNumber` on each client. All writes (insert/update) encrypt the Medicare number before saving. PHI access is logged when Medicare number is inserted or updated.
- **`lib/types.ts`** – `Client` now has optional `hasMedicareNumber?: boolean`.

### Reveal flow (view on demand)

- **`app/api/clients/[id]/reveal-mbi/route.ts`** – GET endpoint: checks auth and that the client belongs to the current user, decrypts `medicare_number`, logs to `phi_access_log` (view, IP, user-agent), returns `{ medicareNumber }`. Medicare number is never included in general client list/detail responses.
- **`components/clients/sections/medicare-section.tsx`** – Uses `hasMedicareNumber` to show “Not on file” vs masked placeholder and Reveal button. On “Reveal” (after confirmation dialog), calls the reveal API and stores the result in local state only; on “Hide”, clears that state so the value is no longer in memory. Existing eye icon + acknowledgment dialog flow is unchanged.

### PHI access logging

- **`lib/db/phi-access-log.ts`** – Helper `logPhiAccess({ userId, clientId, fieldAccessed, accessType, ipAddress?, userAgent? })` for inserting into `phi_access_log`.
- **`supabase/migrations/20260223100000_phi_access_log.sql`** – Creates `phi_access_log` table and RLS (users can insert their own rows, select their own rows). Also adds generated column `has_medicare_number` on `clients` so list/detail can avoid selecting the encrypted `medicare_number`.
- Logging is performed when:
  - A user reveals the Medicare number via the reveal API (access_type `view`, with IP and user-agent).
  - A user inserts or updates a client’s Medicare number (access_type `update`, from server action; IP/user-agent not set).

### Migration script for existing data

- **`scripts/migrate-encrypt-mbi.ts`** – One-time script: reads all clients with non-empty `medicare_number` that are not already in encrypted format, encrypts each, and updates the row. Uses `SUPABASE_SERVICE_ROLE_KEY` so it can update all rows. Supports `--dry-run`.
- **`package.json`** – New script: `migrate:encrypt-mbi` (runs via `tsx`). Dev dependency `tsx` added.

### Environment and config

- **`.env.example`** – Documented `ENCRYPTION_KEY` (32-byte key, e.g. `openssl rand -hex 32`) and optional `SUPABASE_SERVICE_ROLE_KEY` for the migration script.

### Edit / new client

- **Edit client dialog** – Still initializes Medicare field from `client.medicareNumber` (which is now always `""`). User can type a new number and save; server encrypts on update and logs access. No pre-fill of existing Medicare number from API (would require reveal; optional “Load current” can be added later).
- **New client dialog** – Unchanged; server encrypts on insert and logs access.

### Security hardening (audit)

- **Logs** – No `console.log`/`console.error` in the codebase output Medicare numbers or other PHI; only generic error messages or status (e.g. “phi_access_log insert failed”).
- **URLs** – Medicare number is not passed in query params or path segments; client profile uses `/clients/[id]` only.
- **Client state** – Decrypted Medicare number exists only in local component state in `MedicareSection` and is cleared when the user clicks Hide.
- **Supabase** – All client/PHI access uses the server Supabase client (`lib/supabase/server.ts`); no anon client used for PHI.
- **Secrets** – `ENCRYPTION_KEY` is only referenced in `.env.example` as a placeholder; real key must live in `.env.local` or production secrets (`.env*.local` is in `.gitignore`).

---

## 2. RLS Audit

All tables in `supabase/migrations/20260222000000_initial_schema.sql` already had RLS enabled with agent-scoped policies (`auth.uid() = agent_id` or via client ownership). No additional RLS changes were required for those tables. The new `phi_access_log` table has RLS: users may insert rows where `user_id = auth.uid()` and select only their own rows.

---

## 3. Manual Steps You Must Do

1. **Set `ENCRYPTION_KEY`**  
   Generate a 32-byte key and add to `.env.local`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Then add to `.env.local`: `ENCRYPTION_KEY=<paste-64-hex-chars>`.  
   Do not commit `.env.local`. In production, set this in your secrets manager / env config.

2. **Apply the Supabase migration**  
   Run the migration that creates `phi_access_log` and adds `has_medicare_number` to `clients`:
   - **Option A**: Supabase Dashboard → SQL Editor → paste and run the contents of `supabase/migrations/20260223100000_phi_access_log.sql`.
   - **Option B**: If using Supabase CLI: `supabase db push`.

3. **Run the one-time MBI encryption script**  
   After the migration and after setting `ENCRYPTION_KEY` (and optionally `SUPABASE_SERVICE_ROLE_KEY` for the script):
   - Dry run: `pnpm run migrate:encrypt-mbi -- --dry-run`
   - If that looks correct, run without `--dry-run`: `pnpm run migrate:encrypt-mbi`  
   Back up the `clients` table before the first real run if you have existing data.

4. **Optional: `SUPABASE_SERVICE_ROLE_KEY`**  
   Required only for `scripts/migrate-encrypt-mbi.ts`. Get it from Supabase Dashboard → Project Settings → API → `service_role` (secret). Add to `.env.local` and do not commit.

---

## 4. Other PHI to Consider Later

- **DOB + name** – Already stored; consider encryption or stricter access if you need to treat this combination as PHI at rest.
- **SSN** – If you add SSN later, apply the same pattern: encrypt at rest, reveal via a dedicated API with logging, and do not include in general client payloads.

---

## 5. File Summary

| File | Purpose |
|------|--------|
| `lib/encryption.ts` | Encrypt/decrypt and `isEncrypted()` for MBI |
| `lib/db/phi-access-log.ts` | Insert PHI access log rows |
| `lib/db/clients.ts` | No MBI in list payload; encrypt on write; log MBI updates |
| `lib/types.ts` | `hasMedicareNumber` on Client |
| `app/api/clients/[id]/reveal-mbi/route.ts` | On-demand reveal + logging |
| `components/clients/sections/medicare-section.tsx` | Reveal API + local state; hide clears state |
| `supabase/migrations/20260223100000_phi_access_log.sql` | `phi_access_log` table, RLS, `has_medicare_number` on clients |
| `scripts/migrate-encrypt-mbi.ts` | One-time encrypt existing MBI |
| `.env.example` | `ENCRYPTION_KEY` and optional `SUPABASE_SERVICE_ROLE_KEY` |
