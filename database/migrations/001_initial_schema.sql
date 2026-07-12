-- ============================================================================
-- ADePT — Assessor's Office Document Request Tracking and Printing System
-- PostgreSQL 15+ / Supabase Schema
-- Office of the Provincial Assessor, Zamboanga del Norte
--
-- DESIGN PHILOSOPHY
--   This is a REQUEST-TRACKING & DOCUMENT-GENERATION system, not a Property
--   Information System (PIS). Tax Declaration data is captured as an
--   immutable, per-request SNAPSHOT (staff re-type from physical archives
--   each time a request is processed) — never as a shared/master property
--   record. This means:
--     - Every printed document is legally defensible on the data actually
--       encoded for that transaction, even if a later request for the same
--       TD Number is encoded slightly differently (physical record amended,
--       or a prior typo corrected).
--     - Indexes on TD Number / ARP / PIN / Owner Name still let staff find
--       "have we processed this property before" without treating that
--       history as authoritative property data.
--   All primary keys are UUID. Nothing is ever physically deleted
--   (deleted_at / deleted_by everywhere). Corrections use VOID + CLONE.
--   Identity is Supabase Auth (auth.users); `staff` is the office profile
--   that extends it 1:1 — no shared accounts.
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- typo-tolerant search on owner/declarant names

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================
create type action_taken_enum as enum ('PENDING', 'APPROVED', 'DISAPPROVED');

create type request_status_enum as enum (
  'DRAFT',                 -- request form encoded, not yet submitted for payment
  'PENDING_PAYMENT',       -- control number issued, client sent to Treasurer's Office
  'OR_VALIDATED',          -- OR number entered & validated
  'READY_FOR_SIGNATURE',   -- signatory selected, PDF generation pending
  'SIGNED',                -- locked PDF generated, physically signed
  'RELEASED',              -- handed to client
  'VOID'                   -- superseded / cancelled, see void_* columns
);

create type taxability_enum as enum ('TAXABLE', 'EXEMPT');
create type area_unit_enum as enum ('SQM', 'HECTARE');

create type request_document_status_enum as enum (
  'PENDING', 'PDF_GENERATED', 'PRINTED', 'RELEASED'
);

-- Account lifecycle: every new login must be approved by Super Admin before
-- it can do anything in the system; Super Admin can also disable an account
-- at any time (e.g. resignation, leave, suspected misuse).
create type account_status_enum as enum (
  'PENDING_APPROVAL', 'ACTIVE', 'DISABLED', 'REJECTED'
);

create type audit_action_enum as enum (
  'CREATE', 'UPDATE', 'VIEW', 'PRINT', 'RELEASE', 'VOID',
  'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'OR_VALIDATION', 'CLONE', 'AMEND'
);

-- ============================================================================
-- 2. REFERENCE / LOOKUP TABLES
-- ============================================================================

-- Generic extensible lookup pattern for small, admin-maintained value sets
-- (authorization types, purposes, classifications, actual use, property
-- types). New categories can be added by INSERT, not migration.
create table lookup_categories (
  id          uuid primary key default gen_random_uuid(),
  code        varchar(50)  not null unique,   -- e.g. 'AUTHORIZATION_TYPE'
  name        varchar(150) not null,
  created_at  timestamptz  not null default now()
);

create table lookup_values (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references lookup_categories(id),
  code          varchar(50)  not null,
  label         varchar(255) not null,
  description   text,
  sort_order    smallint     not null default 0,
  is_active     boolean      not null default true,
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now(),
  unique (category_id, code)
);
create index idx_lookup_values_category on lookup_values(category_id) where is_active;

-- Document types are a first-class table (not generic lookup) because they
-- carry behavioral flags the application depends on.
create table document_types (
  id                         uuid primary key default gen_random_uuid(),
  code                       varchar(50)  not null unique,
  name                       varchar(255) not null,
  description                text,
  requires_tax_declaration   boolean      not null default true,
  is_active                  boolean      not null default true,
  sort_order                 smallint     not null default 0,
  created_at                 timestamptz  not null default now(),
  updated_at                 timestamptz  not null default now()
);

-- Location normalization (Province is fixed: Zamboanga del Norte)
create table municipalities (
  id          uuid primary key default gen_random_uuid(),
  name        varchar(150) not null unique,
  psgc_code   varchar(20),
  is_active   boolean      not null default true
);

create table barangays (
  id              uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references municipalities(id),
  name            varchar(150) not null,
  psgc_code       varchar(20),
  is_active       boolean not null default true,
  unique (municipality_id, name)
);
create index idx_barangays_municipality on barangays(municipality_id);

-- ============================================================================
-- 3. IDENTITY, STAFF & ACCESS CONTROL
-- ============================================================================

-- Only two roles: SUPER_ADMIN (the office head — manages the system, approves
-- and disables staff accounts, manages lookups/document types/system
-- settings, views system-wide statistics, has full audit trail access) and
-- OFFICE_STAFF (rotating duty — any active staff member may encode, verify,
-- or release; that rotation is enforced at the transaction level, see
-- requests table + trigger below, independent of role). A staff member
-- holds exactly one role at a time (see staff.role_id below) — there is no
-- many-to-many junction table because the office doesn't need one.
create table roles (
  id          uuid primary key default gen_random_uuid(),
  code        varchar(50)  not null unique,     -- SUPER_ADMIN, OFFICE_STAFF
  name        varchar(150) not null,
  description text
);

-- One row per office employee, extending Supabase auth.users 1:1.
-- No shared accounts — auth_user_id is unique and NOT NULL.
--
-- Account lifecycle: a new sign-up creates its own row (self-registration,
-- see RLS policy staff_insert below) with status PENDING_APPROVAL. It has
-- no effective access anywhere in the system until Super Admin approves it
-- (fn_current_staff_id() only resolves ACTIVE accounts, and every other RLS
-- policy in this schema is keyed off that function).
create table staff (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid not null unique references auth.users(id),
  employee_number varchar(50)  not null unique,
  last_name       varchar(150) not null,
  first_name      varchar(150) not null,
  position        varchar(255),
  email           varchar(255),
  role_id         uuid not null references roles(id),

  account_status  account_status_enum not null default 'PENDING_APPROVAL',
  approved_by     uuid references staff(id),
  approved_at     timestamptz,
  disabled_by     uuid references staff(id),
  disabled_at     timestamptz,
  disable_reason  text,

  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now(),
  deleted_at      timestamptz,
  deleted_by      uuid references staff(id),

  constraint chk_disable_reason check (account_status <> 'DISABLED' or disable_reason is not null)
);
create index idx_staff_status on staff(account_status) where deleted_at is null;
create index idx_staff_role on staff(role_id);

-- Authorized signatories may or may not have a login (e.g. the Provincial
-- Assessor may not personally use the system), hence the optional link.
create table authorized_signatories (
  id             uuid primary key default gen_random_uuid(),
  staff_id       uuid references staff(id),
  full_name      varchar(255) not null,
  position       varchar(255) not null,
  is_active      boolean      not null default true,
  effective_date date,
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now()
);

-- ============================================================================
-- 4. CONTROL NUMBER GENERATION (atomic, gap-free per year, no duplicates)
-- ============================================================================
create table control_number_counters (
  year        smallint primary key,
  last_number bigint not null default 0
);

create or replace function generate_control_number(p_year smallint default null)
returns varchar
language plpgsql
as $$
declare
  v_year   smallint := coalesce(p_year, extract(year from now())::smallint);
  v_number bigint;
begin
  insert into control_number_counters (year, last_number)
  values (v_year, 1)
  on conflict (year) do update
    set last_number = control_number_counters.last_number + 1
  returning last_number into v_number;

  return 'ADePT-' || v_year::text || '-' || lpad(v_number::text, 6, '0');
end;
$$;

-- Generic "touch updated_at" trigger function, reused across tables.
create or replace function fn_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================================
-- 5. CORE TRANSACTIONAL TABLES
-- ============================================================================

-- One row per client Request Form (the transaction header).
create table requests (
  id                       uuid primary key default gen_random_uuid(),
  control_number           varchar(30) not null unique,

  -- Request form fields
  declarant_name           varchar(255) not null,
  request_date             date not null default current_date,
  authorization_required   boolean not null default false,
  authorization_type_id    uuid references lookup_values(id),   -- category AUTHORIZATION_TYPE
  authorization_reference  varchar(255),                         -- e.g. SPA / letter doc no.

  -- Front-desk verification of Valid ID / SPA / Authorization Letter. The
  -- office does not currently digitize or store copies of these documents,
  -- so this is a verification record, not a document store: who checked it,
  -- and when — not the document itself.
  requirements_verified     boolean not null default false,
  requirements_verified_by  uuid references staff(id),
  requirements_verified_at  timestamptz,

  purpose_id               uuid references lookup_values(id),   -- category PURPOSE
  purpose_other_text       varchar(255),
  requested_by_name        varchar(255),                        -- signature line on the form
  action_taken             action_taken_enum not null default 'PENDING',
  archive_returned_date    date,

  -- Requester ID verification (compliance enhancement beyond the paper form)
  id_type_presented        varchar(100),
  id_number_presented      varchar(100),

  -- Workflow & accountability
  status        request_status_enum not null default 'DRAFT',
  encoded_by    uuid not null references staff(id),
  verified_by   uuid references staff(id),
  released_by   uuid references staff(id),
  signatory_id  uuid references authorized_signatories(id),

  -- Void / amend — records are never deleted
  is_void                 boolean not null default false,
  void_reason              text,
  voided_by                uuid references staff(id),
  voided_at                timestamptz,
  cloned_from_request_id   uuid references requests(id),
  clone_reason             text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references staff(id),

  constraint chk_verifier_not_encoder check (verified_by is null or verified_by <> encoded_by),
  constraint chk_releaser_not_encoder check (released_by is null or released_by <> encoded_by),
  constraint chk_void_reason          check (not is_void or void_reason is not null),
  constraint chk_requirements_verified_attribution check (
    not requirements_verified or (requirements_verified_by is not null and requirements_verified_at is not null)
  )
);

create or replace function fn_assign_control_number()
returns trigger language plpgsql as $$
begin
  if new.control_number is null then
    new.control_number := generate_control_number();
  end if;
  return new;
end;
$$;

create trigger trg_requests_control_number
before insert on requests
for each row execute function fn_assign_control_number();

create trigger trg_requests_touch
before update on requests
for each row execute function fn_touch_updated_at();

-- Separation-of-duties safety net at the database layer (defense in depth;
-- the application/UI layer should also prevent this from being attempted).
create or replace function fn_enforce_separation_of_duties()
returns trigger language plpgsql as $$
begin
  if new.verified_by is not null and new.verified_by = new.encoded_by then
    raise exception 'Separation of duties violation: encoder cannot verify their own request (request %)', new.id;
  end if;
  if new.released_by is not null and new.released_by = new.encoded_by then
    raise exception 'Separation of duties violation: encoder cannot release their own request (request %)', new.id;
  end if;
  return new;
end;
$$;

create trigger trg_requests_separation_of_duties
before insert or update on requests
for each row execute function fn_enforce_separation_of_duties();

-- ----------------------------------------------------------------------------
-- Encoded Tax Declaration snapshots (immutable-by-convention per request)
-- ----------------------------------------------------------------------------
create table encoded_tax_declarations (
  id                              uuid primary key default gen_random_uuid(),
  request_id                      uuid not null references requests(id),

  -- Property Information
  tax_declaration_number          varchar(50) not null,
  property_identification_number  varchar(50),
  arp_number                      varchar(50),
  oct_tct_cloa_number             varchar(50),
  cct_number                      varchar(50),
  survey_number                   varchar(50),
  lot_number                      varchar(50),
  block_number                    varchar(50),
  registered_date                 date,

  -- Owner Information
  owner_name       varchar(255) not null,
  owner_tin        varchar(20),
  owner_address    text,
  owner_telephone  varchar(20),

  -- Administrator Information
  administrator_name       varchar(255),
  administrator_tin        varchar(20),
  administrator_address    text,
  administrator_telephone  varchar(20),

  -- Location
  property_street  varchar(255),
  barangay_id      uuid references barangays(id),
  municipality_id  uuid references municipalities(id),

  -- Boundaries
  boundary_north text,
  boundary_south text,
  boundary_east  text,
  boundary_west  text,

  -- Totals & other information
  total_market_value      numeric(15,2),
  total_assessed_value    numeric(15,2),
  amount_in_words         varchar(500),
  taxability               taxability_enum,
  effectivity_year         smallint,
  cancelled_td_number      varchar(50),
  previous_assessed_value  numeric(15,2),
  memoranda                text,
  notes                    text,

  encoded_by  uuid not null references staff(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  deleted_by  uuid references staff(id)
);
create trigger trg_etd_touch before update on encoded_tax_declarations
for each row execute function fn_touch_updated_at();

-- A Tax Declaration snapshot may cover multiple property types (Land,
-- Building, Machinery, Others), each with its own descriptive detail.
create table encoded_property_types (
  id                          uuid primary key default gen_random_uuid(),
  encoded_tax_declaration_id  uuid not null references encoded_tax_declarations(id),
  property_type_id            uuid not null references lookup_values(id), -- category PROPERTY_TYPE
  brief_description            text,
  number_of_storeys            smallint,
  specify                       varchar(255),
  created_at                   timestamptz not null default now()
);
create index idx_ept_etd on encoded_property_types(encoded_tax_declaration_id);

-- A Tax Declaration snapshot may contain multiple assessment rows.
create table encoded_assessment_rows (
  id                          uuid primary key default gen_random_uuid(),
  encoded_tax_declaration_id  uuid not null references encoded_tax_declarations(id),
  row_order                    smallint not null default 0,
  classification_id            uuid references lookup_values(id),  -- category CLASSIFICATION
  actual_use_id                 uuid references lookup_values(id),  -- category ACTUAL_USE
  actual_use_other_text         varchar(255),
  area                           numeric(14,4),
  area_unit                      area_unit_enum,
  market_value                   numeric(15,2),
  assessment_level               numeric(5,2),   -- percentage, e.g. 12.00
  assessed_value                  numeric(15,2),
  created_at                      timestamptz not null default now()
);
create index idx_ear_etd on encoded_assessment_rows(encoded_tax_declaration_id);

-- ----------------------------------------------------------------------------
-- Requested documents (one request -> many document types / TDs).
-- This table represents WHAT was requested. Everything about the actual
-- generated PDF (which version, when, by whom, its file hash) now lives in
-- generated_documents below — one request_documents row can accumulate many
-- generated_documents rows over time (reprints, corrections), which a single
-- pdf_file_reference column could never represent cleanly.
-- ----------------------------------------------------------------------------
create table request_documents (
  id                          uuid primary key default gen_random_uuid(),
  request_id                  uuid not null references requests(id),
  document_type_id            uuid not null references document_types(id),
  encoded_tax_declaration_id  uuid references encoded_tax_declarations(id), -- null for docs that need no TD (e.g. Certificate of No Landholding)
  status                       request_document_status_enum not null default 'PENDING',
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);
create index idx_rd_request on request_documents(request_id);
create trigger trg_rd_touch before update on request_documents
for each row execute function fn_touch_updated_at();

-- ----------------------------------------------------------------------------
-- Generated Documents — metadata about every PDF actually generated for a
-- requested document. Supports: generation history, reprints (a new row,
-- not an overwrite), future QR verification (verification_code could be
-- added here later), future digital signatures, and the void-and-amend
-- pattern applied to the document artifact itself, not just the request.
--
-- version_number + is_current model "this is the 3rd PDF generated for this
-- requested document, and only one of the (non-void) versions is the one
-- currently valid to hand to the client" — enforced below by a partial
-- unique index, not just application logic.
-- ----------------------------------------------------------------------------
create table generated_documents (
  id                    uuid primary key default gen_random_uuid(),
  request_document_id   uuid not null references request_documents(id),
  version_number        smallint not null default 1,
  generated_by          uuid not null references staff(id),
  generated_at          timestamptz not null default now(),
  pdf_path              text not null,
  file_hash             varchar(128),   -- e.g. sha256 hex digest, to detect tampering later
  is_current            boolean not null default true,
  is_void                boolean not null default false,
  void_reason            text,
  created_at             timestamptz not null default now(),

  constraint chk_gendoc_void_reason check (not is_void or void_reason is not null),
  unique (request_document_id, version_number)
);
create index idx_gendoc_request_document on generated_documents(request_document_id);

-- Auto-assign the next version number for this requested document, so the
-- app never has to compute "what's the current max version" itself (and
-- two staff generating a reprint at the same moment can't both grab the
-- same version_number — protected by the unique constraint above plus this
-- trigger running inside the same transaction as the insert).
create or replace function fn_assign_document_version()
returns trigger language plpgsql as $$
begin
  select coalesce(max(version_number), 0) + 1 into new.version_number
  from generated_documents
  where request_document_id = new.request_document_id;
  return new;
end;
$$;

create trigger trg_gendoc_assign_version
before insert on generated_documents
for each row execute function fn_assign_document_version();

-- Only one CURRENT, non-void version may exist per requested document at a
-- time — this is the actual "which PDF is valid right now" guarantee.
create unique index idx_gendoc_one_current
  on generated_documents(request_document_id)
  where is_current and not is_void;

-- When a new version is marked current, automatically retire the previous
-- current version — so the app never has to remember to do this itself,
-- and a race between two staff generating a reprint at once can't leave two
-- rows both claiming to be current. Must run BEFORE insert: the partial
-- unique index idx_gendoc_one_current is checked immediately (it isn't
-- deferrable), so the old row has to be retired first, not after the new
-- row already exists — confirmed by hitting the unique-violation exactly
-- this way in testing when this was an AFTER trigger.
create or replace function fn_retire_previous_generated_document()
returns trigger language plpgsql as $$
begin
  if new.is_current then
    update generated_documents
    set is_current = false
    where request_document_id = new.request_document_id
      and is_current;
  end if;
  return new;
end;
$$;

create trigger trg_gendoc_retire_previous
before insert on generated_documents
for each row execute function fn_retire_previous_generated_document();

-- Keep request_documents.status in sync automatically, since generation and
-- printing are now tracked in their own tables rather than columns on
-- request_documents itself. The app never has to remember to update this
-- separately from inserting the generation/print event.
--
-- Two separate functions, not one branching on tg_table_name: PL/pgSQL
-- resolves NEW's fields against the actual record type of whichever table
-- fired the trigger, so a reference to a column that only exists on the
-- other table (e.g. generated_documents.is_current from a print_history
-- invocation) errors immediately regardless of which branch would "reach"
-- it at runtime — confirmed by hitting exactly this error in testing.
create or replace function fn_sync_status_on_generation()
returns trigger language plpgsql as $$
begin
  if new.is_current and not new.is_void then
    update request_documents set status = 'PDF_GENERATED', updated_at = now()
    where id = new.request_document_id;
  end if;
  return new;
end;
$$;

create trigger trg_gendoc_sync_status
after insert on generated_documents
for each row execute function fn_sync_status_on_generation();

-- Companion to fn_sync_status_on_generation above, for the print side of the
-- same status-sync responsibility. Kept as a separate function (not a single
-- one branching on tg_table_name) because NEW's available columns differ by
-- source table — see the note above fn_sync_status_on_generation.
create or replace function fn_sync_status_on_print()
returns trigger language plpgsql as $$
declare
  v_request_document_id uuid;
begin
  select request_document_id into v_request_document_id
  from generated_documents where id = new.generated_document_id;

  update request_documents set status = 'PRINTED', updated_at = now()
  where id = v_request_document_id;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Official Receipt validation & reuse tracking
-- ----------------------------------------------------------------------------
create table or_usage_log (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid not null unique references requests(id),
  or_number           varchar(50) not null,
  or_date             date,
  or_amount           numeric(12,2),
  is_reuse            boolean not null default false,
  reuse_justification text,
  validated_by        uuid not null references staff(id),
  validated_at        timestamptz not null default now(),
  created_at          timestamptz not null default now(),

  constraint chk_reuse_justification check (not is_reuse or reuse_justification is not null)
);
create index idx_or_usage_or_number on or_usage_log(or_number);

-- Flags is_reuse automatically when an OR number has been seen before,
-- and blocks the insert until the app supplies a justification.
create or replace function fn_flag_or_reuse()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from or_usage_log where or_number = new.or_number) then
    new.is_reuse := true;
    if new.reuse_justification is null then
      raise exception 'OR Number % has already been used. A reuse justification is required.', new.or_number;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_or_usage_flag_reuse
before insert on or_usage_log
for each row execute function fn_flag_or_reuse();

-- ----------------------------------------------------------------------------
-- Print history — every physical print of a specific generated PDF version,
-- including reprints. Points at generated_documents (a specific version),
-- not request_documents, so a reprint of an older version is distinguishable
-- from a print of the current one.
-- ----------------------------------------------------------------------------
create table print_history (
  id                     uuid primary key default gen_random_uuid(),
  generated_document_id  uuid not null references generated_documents(id),
  printed_by             uuid not null references staff(id),
  printed_at             timestamptz not null default now(),
  copy_number            smallint not null default 1,
  reprint_reason         text,
  created_at             timestamptz not null default now()
);
create index idx_print_history_gendoc on print_history(generated_document_id);

create trigger trg_print_sync_status
after insert on print_history
for each row execute function fn_sync_status_on_print();

-- ----------------------------------------------------------------------------
-- Request status history (workflow trail, independent of the audit log so
-- it can drive UI timelines cheaply without scanning generic audit rows)
-- ----------------------------------------------------------------------------
create table request_status_history (
  id                uuid primary key default gen_random_uuid(),
  request_id         uuid not null references requests(id),
  previous_status     request_status_enum,
  new_status          request_status_enum not null,
  changed_by           uuid not null references staff(id),
  changed_at           timestamptz not null default now(),
  remarks              text
);
create index idx_rsh_request on request_status_history(request_id);

-- SECURITY DEFINER is intentional: request_status_history has no direct
-- INSERT policy for the app (see RLS section below) because it should only
-- ever be populated by this trigger, never fabricated directly by a client
-- — that's what makes it trustworthy as a derived audit trail. Running the
-- trigger itself with definer privileges is what lets it write despite that
-- restriction.
create or replace function fn_log_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into request_status_history (request_id, previous_status, new_status, changed_by, remarks)
    values (
      new.id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      coalesce(new.verified_by, new.released_by, new.encoded_by),
      null
    );
  end if;
  return new;
end;
$$;

create trigger trg_requests_status_history
after insert or update of status on requests
for each row execute function fn_log_status_change();

-- ============================================================================
-- 6. AUDIT LOG (append-only, government-grade)
-- ============================================================================
create table audit_logs (
  id           uuid primary key default gen_random_uuid(),
  staff_id      uuid references staff(id),   -- nullable only for system-level events
  action_type   audit_action_enum not null,
  table_name    varchar(100),
  record_id     uuid,
  old_values    jsonb,
  new_values    jsonb,
  description   text,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index idx_audit_logs_record on audit_logs(table_name, record_id);
create index idx_audit_logs_staff on audit_logs(staff_id);
create index idx_audit_logs_created_at on audit_logs(created_at);

-- Enforce append-only at the database level: no UPDATE or DELETE, ever.
create or replace function fn_block_audit_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_logs is append-only: % is not permitted', tg_op;
end;
$$;

create trigger trg_audit_no_update
before update on audit_logs
for each row execute function fn_block_audit_mutation();

create trigger trg_audit_no_delete
before delete on audit_logs
for each row execute function fn_block_audit_mutation();

-- ============================================================================
-- 6B. SYSTEM SETTINGS & SESSION TRACKING
-- ============================================================================

-- Configurable system values instead of hardcoding them in the application.
-- setting_value is stored as text; the application is responsible for
-- parsing it according to the convention implied by setting_key (e.g.
-- session_timeout_minutes -> integer, allow_reprint -> 'true'/'false').
create table system_settings (
  id            uuid primary key default gen_random_uuid(),
  setting_key   varchar(100) not null unique,
  setting_value text,
  description   text,
  updated_by    uuid references staff(id),
  updated_at    timestamptz not null default now()
);

create trigger trg_settings_touch before update on system_settings
for each row execute function fn_touch_updated_at();

-- Login sessions, tracked SEPARATELY from audit_logs. audit_logs already
-- records LOGIN/LOGOUT as immutable historical events (see action_type
-- enum) — but that append-only log is the wrong shape for "who is logged
-- in right now" or "force-logout this session", both of which need a row
-- you can UPDATE (logout_time, is_active) and query cheaply without
-- scanning the entire audit history. The two tables serve different
-- questions: audit_logs answers "what happened and when, forever";
-- login_sessions answers "what is the current state of active sessions".
create table login_sessions (
  id           uuid primary key default gen_random_uuid(),
  staff_id     uuid not null references staff(id),
  login_time   timestamptz not null default now(),
  logout_time  timestamptz,
  ip_address   inet,
  user_agent   text,
  is_active    boolean not null default true
);
create index idx_login_sessions_staff on login_sessions(staff_id);
create index idx_login_sessions_active on login_sessions(staff_id) where is_active;

-- ============================================================================
-- 7. INDEXES (search & required lookups)
-- ============================================================================
create unique index if not exists idx_requests_control_number on requests(control_number);
create index idx_requests_created_at on requests(created_at);
create index idx_requests_declarant_name_trgm on requests using gin (declarant_name gin_trgm_ops);

create index idx_etd_td_number on encoded_tax_declarations(tax_declaration_number);
create index idx_etd_arp_number on encoded_tax_declarations(arp_number);
create index idx_etd_pin on encoded_tax_declarations(property_identification_number);
create index idx_etd_owner_name on encoded_tax_declarations(owner_name);
create index idx_etd_owner_name_trgm on encoded_tax_declarations using gin (owner_name gin_trgm_ops);
create index idx_etd_td_arp_composite on encoded_tax_declarations(tax_declaration_number, arp_number);
create index idx_etd_location on encoded_tax_declarations(municipality_id, barangay_id);

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================
alter table staff enable row level security;
alter table requests enable row level security;
alter table request_documents enable row level security;
alter table encoded_tax_declarations enable row level security;
alter table encoded_property_types enable row level security;
alter table encoded_assessment_rows enable row level security;
alter table or_usage_log enable row level security;
alter table print_history enable row level security;
alter table request_status_history enable row level security;
alter table audit_logs enable row level security;
alter table document_types enable row level security;
alter table lookup_categories enable row level security;
alter table lookup_values enable row level security;
alter table municipalities enable row level security;
alter table barangays enable row level security;
alter table authorized_signatories enable row level security;
alter table roles enable row level security;
alter table generated_documents enable row level security;
alter table system_settings enable row level security;
alter table login_sessions enable row level security;

-- Helper: resolve the calling auth.uid() to an active staff row.
-- Only ACTIVE, non-deleted accounts resolve to a usable staff identity.
-- A PENDING_APPROVAL or DISABLED account therefore has zero effective
-- access anywhere in the system, since every policy below is keyed off
-- this function.
--
-- SECURITY DEFINER is required here, not optional: the staff_select RLS
-- policy itself calls fn_current_staff_id() to decide what a caller may
-- see. If this function were a plain (invoker-rights) function, its
-- internal "select ... from staff" would itself be subject to the
-- staff_select policy, which calls fn_current_staff_id() again — infinite
-- recursion (confirmed in testing: Postgres throws "stack depth limit
-- exceeded" the moment this runs as a real non-owner role). Marking it
-- SECURITY DEFINER makes its internal query run with the function owner's
-- privileges, which bypasses RLS entirely (the standard, documented way to
-- break this cycle), so the recursion never starts.
create or replace function fn_current_staff_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select id from staff
  where auth_user_id = auth.uid()
    and account_status = 'ACTIVE'
    and deleted_at is null;
$$;

-- Same reasoning as above: this queries staff directly and must not be
-- re-subject to staff's own RLS policies.
create or replace function fn_has_role(p_role_code varchar)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff s
    join roles r on r.id = s.role_id
    where s.id = fn_current_staff_id() and r.code = p_role_code
  );
$$;

create or replace function fn_is_super_admin()
returns boolean
language sql stable
as $$
  select fn_has_role('SUPER_ADMIN');
$$;

-- Transactional tables: any active staff member may read office-wide
-- (verification/release requires seeing requests they didn't encode).
-- Inserts must be attributed to the caller; updates/voids gated by role
-- where the workflow demands it.
create policy requests_select on requests for select
  using (fn_current_staff_id() is not null);

create policy requests_insert on requests for insert
  with check (encoded_by = fn_current_staff_id());

create policy requests_update on requests for update
  using (fn_current_staff_id() is not null);

create policy request_documents_all on request_documents for all
  using (fn_current_staff_id() is not null);

create policy etd_all on encoded_tax_declarations for all
  using (fn_current_staff_id() is not null);

create policy ept_all on encoded_property_types for all
  using (fn_current_staff_id() is not null);

create policy ear_all on encoded_assessment_rows for all
  using (fn_current_staff_id() is not null);

create policy or_usage_all on or_usage_log for all
  using (fn_current_staff_id() is not null);

create policy print_history_all on print_history for all
  using (fn_current_staff_id() is not null);

create policy rsh_select on request_status_history for select
  using (fn_current_staff_id() is not null);

-- Audit logs: everyone can INSERT (via trusted server-side function), but
-- only Super Admin may read the raw trail.
create policy audit_insert on audit_logs for insert
  with check (true);

create policy audit_select on audit_logs for select
  using (fn_is_super_admin());

-- Reference/lookup tables: everyone can read; only Super Admin may write.
create policy lookups_read on lookup_values for select using (true);
create policy lookups_write on lookup_values for insert with check (fn_is_super_admin());
create policy lookups_update on lookup_values for update using (fn_is_super_admin());

create policy doc_types_read on document_types for select using (true);
create policy doc_types_write on document_types for insert with check (fn_is_super_admin());
create policy doc_types_update on document_types for update using (fn_is_super_admin());

create policy municipalities_read on municipalities for select using (true);
create policy barangays_read on barangays for select using (true);

-- Staff: a brand-new Supabase Auth sign-up may insert exactly one row for
-- itself (self-registration), which starts PENDING_APPROVAL and has no
-- other access until Super Admin approves it. Critically, the insert is
-- only allowed if role_id resolves to OFFICE_STAFF — a self-registering
-- user cannot grant themselves SUPER_ADMIN by simply passing a different
-- role_id in the request payload. The one Super Admin account is bootstrapped
-- manually (a one-time manual insert after deployment), never self-registered.
-- Anyone can read the staff directory (needed to attribute encoder/verifier/
-- releaser names in the UI) plus their own row regardless of status (so a
-- pending/disabled user can see "your account is awaiting approval" /
-- "your account is disabled"). Only Super Admin may approve, disable, or
-- otherwise update staff rows (including promoting someone to SUPER_ADMIN,
-- which is just a normal UPDATE of role_id via this same policy).
create policy staff_insert on staff for insert
  with check (
    auth_user_id = auth.uid()
    and role_id = (select id from roles where code = 'OFFICE_STAFF')
  );

create policy staff_select on staff for select
  using (fn_current_staff_id() is not null or auth_user_id = auth.uid());

create policy staff_update on staff for update
  using (fn_is_super_admin());

create policy signatories_read on authorized_signatories for select using (true);
create policy signatories_write on authorized_signatories for insert with check (fn_is_super_admin());

create policy roles_read on roles for select using (true);

-- Generated documents: any active staff member may generate/view/void a
-- document (consistent with how void/amend is handled everywhere else in
-- this schema — corrections are a rotating-duty action, not an admin-only
-- one). Attribution (generated_by) is enforced at the application layer,
-- same pattern as encoded_by on requests.
create policy generated_documents_all on generated_documents for all
  using (fn_current_staff_id() is not null);

-- System settings: every active staff member needs to read these (session
-- timeout, allow_reprint, etc. drive UI/behavior for everyone); only Super
-- Admin may change them.
create policy settings_read on system_settings for select
  using (fn_current_staff_id() is not null);
create policy settings_write on system_settings for insert with check (fn_is_super_admin());
create policy settings_update on system_settings for update using (fn_is_super_admin());

-- Login sessions: a staff member manages their own session rows (the app
-- inserts one at login, updates it at logout); Super Admin can see and
-- force-close anyone's session (e.g. "who's currently logged in" dashboard,
-- or revoking access immediately after a disable).
create policy sessions_select on login_sessions for select
  using (staff_id = fn_current_staff_id() or fn_is_super_admin());
create policy sessions_insert on login_sessions for insert
  with check (staff_id = fn_current_staff_id());
create policy sessions_update on login_sessions for update
  using (staff_id = fn_current_staff_id() or fn_is_super_admin());

-- ----------------------------------------------------------------------------
-- System statistics — restricted to Super Admin. A SECURITY DEFINER function
-- (rather than a plain view) so access control lives in one obvious place
-- and can't be bypassed by querying the underlying tables directly through
-- some other route, since it explicitly checks the caller's role first.
-- ----------------------------------------------------------------------------
create or replace function get_system_statistics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not fn_is_super_admin() then
    raise exception 'Only Super Admin may view system statistics';
  end if;

  select jsonb_build_object(
    'total_requests', (select count(*) from requests where deleted_at is null),
    'requests_by_status', (
      select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
      from (select status, count(*) cnt from requests where deleted_at is null group by status) s
    ),
    'documents_generated_by_type', (
      select coalesce(jsonb_object_agg(dt.name, cnt), '{}'::jsonb)
      from (
        select rd.document_type_id, count(*) cnt
        from generated_documents gd
        join request_documents rd on rd.id = gd.request_document_id
        where not gd.is_void
        group by rd.document_type_id
      ) g
      join document_types dt on dt.id = g.document_type_id
    ),
    'void_count', (select count(*) from requests where is_void and deleted_at is null),
    'void_generated_documents_count', (select count(*) from generated_documents where is_void),
    'or_reuse_flag_count', (select count(*) from or_usage_log where is_reuse),
    'pending_account_approvals', (select count(*) from staff where account_status = 'PENDING_APPROVAL'),
    'active_staff_count', (select count(*) from staff where account_status = 'ACTIVE' and deleted_at is null),
    'disabled_staff_count', (select count(*) from staff where account_status = 'DISABLED'),
    'active_login_sessions', (select count(*) from login_sessions where is_active),
    'generated_at', now()
  ) into v_result;

  return v_result;
end;
$$;

-- ----------------------------------------------------------------------------
-- Account approval / disable — the two Super Admin actions this system was
-- specifically asked to support. SECURITY DEFINER + explicit role check so
-- the app layer never needs to hand-craft the UPDATE (and never needs
-- table-level UPDATE privilege on staff to do it).
-- ----------------------------------------------------------------------------
create or replace function approve_staff_account(p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not fn_is_super_admin() then
    raise exception 'Only Super Admin may approve staff accounts';
  end if;

  update staff
  set account_status = 'ACTIVE',
      approved_by = fn_current_staff_id(),
      approved_at = now(),
      disabled_by = null,
      disabled_at = null,
      disable_reason = null
  where id = p_staff_id;

  insert into audit_logs (staff_id, action_type, table_name, record_id, description)
  values (fn_current_staff_id(), 'UPDATE', 'staff', p_staff_id, 'Account approved by Super Admin');
end;
$$;

create or replace function disable_staff_account(p_staff_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not fn_is_super_admin() then
    raise exception 'Only Super Admin may disable staff accounts';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to disable a staff account';
  end if;

  update staff
  set account_status = 'DISABLED',
      disabled_by = fn_current_staff_id(),
      disabled_at = now(),
      disable_reason = p_reason
  where id = p_staff_id;

  insert into audit_logs (staff_id, action_type, table_name, record_id, description)
  values (fn_current_staff_id(), 'UPDATE', 'staff', p_staff_id, 'Account disabled: ' || p_reason);
end;
$$;

-- ============================================================================
-- 9. VIEWS (convenience, not a substitute for the base tables)
-- ============================================================================
create or replace view v_active_requests as
select * from requests where deleted_at is null and not is_void;

create or replace view v_request_summary as
select
  r.id, r.control_number, r.declarant_name, r.status,
  r.action_taken, r.request_date,
  enc.first_name || ' ' || enc.last_name as encoded_by_name,
  ver.first_name || ' ' || ver.last_name as verified_by_name,
  rel.first_name || ' ' || rel.last_name as released_by_name,
  r.is_void
from requests r
left join staff enc on enc.id = r.encoded_by
left join staff ver on ver.id = r.verified_by
left join staff rel on rel.id = r.released_by
where r.deleted_at is null;

-- ============================================================================
-- 10. SEED DATA (lookup categories, document types, roles)
-- ============================================================================
insert into lookup_categories (code, name) values
  ('AUTHORIZATION_TYPE', 'Authorization Type'),
  ('PURPOSE', 'Purpose of Request'),
  ('CLASSIFICATION', 'Assessment Classification'),
  ('ACTUAL_USE', 'Actual Use'),
  ('PROPERTY_TYPE', 'Property Type')
on conflict (code) do nothing;

insert into lookup_values (category_id, code, label, sort_order)
select id, v.code, v.label, v.sort_order from lookup_categories,
  (values ('SPA', 'Special Power of Attorney', 1),
          ('AUTH_LETTER', 'Authorization Letter', 2)) as v(code, label, sort_order)
where lookup_categories.code = 'AUTHORIZATION_TYPE'
on conflict do nothing;

insert into lookup_values (category_id, code, label, sort_order)
select id, v.code, v.label, v.sort_order from lookup_categories,
  (values ('TAX_OBLIGATION', 'For Settling of Tax Obligation', 1),
          ('LEGAL', 'For Court and Other Legal Purposes', 2),
          ('OTHERS', 'Others', 3)) as v(code, label, sort_order)
where lookup_categories.code = 'PURPOSE'
on conflict do nothing;

insert into lookup_values (category_id, code, label, sort_order)
select id, v.code, v.label, v.sort_order from lookup_categories,
  (values ('AGRICULTURAL', 'Agricultural', 1),
          ('RESIDENTIAL', 'Residential', 2),
          ('COMMERCIAL', 'Commercial', 3),
          ('INDUSTRIAL', 'Industrial', 4),
          ('SPECIAL', 'Special', 5)) as v(code, label, sort_order)
where lookup_categories.code = 'CLASSIFICATION'
on conflict do nothing;

insert into lookup_values (category_id, code, label, sort_order)
select id, v.code, v.label, v.sort_order from lookup_categories,
  (values ('LAND', 'Land', 1),
          ('BUILDING', 'Building', 2),
          ('MACHINERY', 'Machinery', 3),
          ('OTHERS', 'Others', 4)) as v(code, label, sort_order)
where lookup_categories.code = 'PROPERTY_TYPE'
on conflict do nothing;

insert into document_types (code, name, requires_tax_declaration, sort_order) values
  ('CTC_LATEST_TD', 'Certified True Copy of Latest Tax Declaration', true, 1),
  ('CTC_OLD_TD',    'Certified True Copy of Old Tax Declaration',    true, 2),
  ('CERT_LANDHOLDING',    'Certificate of Landholding',    true,  3),
  ('CERT_NO_LANDHOLDING', 'Certificate of No Landholding', false, 4),
  ('TAX_MAP_VERIFICATION', 'Tax Map Verification', true, 5),
  ('DEED_OF_CONVEYANCE',   'Deed of Conveyance',   true, 6)
on conflict (code) do nothing;

insert into roles (code, name, description) values
  ('SUPER_ADMIN', 'Super Admin', 'Office head. Approves/disables staff accounts, manages lookups and document types, views system statistics, has full audit trail access.'),
  ('OFFICE_STAFF', 'Office Staff', 'May encode, verify, or release any request (rotating duty). Default role granted on account approval.')
on conflict (code) do nothing;

insert into system_settings (setting_key, setting_value, description) values
  ('office_name', 'Office of the Provincial Assessor', 'Displayed on generated documents and the app header'),
  ('province_name', 'Zamboanga del Norte', 'Displayed on generated documents and the app header'),
  ('session_timeout_minutes', '30', 'Idle time before a staff session is force-logged-out'),
  ('max_login_attempts', '5', 'Failed attempts allowed before temporary lockout (enforced by the app / Supabase Auth)'),
  ('allow_reprint', 'true', 'Whether staff may generate a new PDF version for an already-generated document'),
  ('archive_after_days', '365', 'Days after release before a request is eligible for cold-storage archival (informational; no automated job in this schema)')
on conflict (setting_key) do nothing;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
