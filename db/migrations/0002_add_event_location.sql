-- Adds the mailbox folder and provider message id to mail_events, needed to
-- re-fetch the source message when the durable workflow processes a claimed
-- event (see docs/superpowers/plans/2026-09-02-hostinger-mail-agent.md, Task 10).
alter table mail_events
  add column folder text not null default 'INBOX',
  add column message_id text not null default '';

alter table mail_events alter column folder drop default;
alter table mail_events alter column message_id drop default;
