-- The full-body fetch (bodyUrl) returns only plainText/html, no headers.
-- Subject must come from the webhook payload itself at claim time.
alter table mail_events
  add column subject text not null default '';

alter table mail_events alter column subject drop default;
