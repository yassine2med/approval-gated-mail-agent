-- Captures the sender address exactly as reported by the Hostinger webhook
-- payload, independent of whatever ends up on the draft after processing.
-- This gives lib/policy.ts's recipient check a real second source to
-- compare against, instead of comparing a value to itself (see
-- lib/send-draft.ts — previously `isAllowedRecipient(claimed.senderAddress,
-- { originalSenderAddress: claimed.senderAddress })`, a tautology that
-- could never fail).
alter table mail_events
  add column sender_address text not null default '';

alter table mail_events alter column sender_address drop default;
