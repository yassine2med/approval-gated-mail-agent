create extension if not exists pgcrypto;

create table mail_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  payload_hash text not null,
  mailbox_resource_id text not null,
  received_at timestamptz not null,
  state text not null check (state in ('CLAIMED','PROCESSING','DRAFTED','FAILED')) default 'CLAIMED',
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mail_drafts (
  id uuid primary key default gen_random_uuid(),
  mail_event_id uuid not null unique references mail_events(id) on delete cascade,
  classification text not null check (classification in ('ACTION_REQUIRED','INFORMATIONAL','SPAM_OR_UNSAFE','NEEDS_HUMAN_REVIEW')),
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  sender_address text not null,
  subject_preview text not null,
  body_preview text not null,
  proposed_subject text not null,
  proposed_reply text not null,
  edited_reply text,
  status text not null check (status in ('PENDING','APPROVED','REJECTED','NO_REPLY_NEEDED','SENT','SEND_FAILED','SEND_STATUS_UNKNOWN')) default 'PENDING',
  send_idempotency_key text unique,
  approved_by text,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mail_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  outcome text not null,
  created_at timestamptz not null default now()
);

create index mail_events_state_idx on mail_events(state);
create index mail_drafts_status_idx on mail_drafts(status);
create index mail_audit_events_target_idx on mail_audit_events(target_type, target_id);
