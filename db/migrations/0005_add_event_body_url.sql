-- Real Hostinger webhook payloads carry only a truncated body preview inline
-- plus a signed bodyUrl (short-lived GCS link) for the full message content.
-- The durable workflow fetches that URL during processing, so it needs to be
-- persisted at claim time.
alter table mail_events
  add column body_url text not null default '';

alter table mail_events alter column body_url drop default;
