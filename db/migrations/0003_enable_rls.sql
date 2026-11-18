-- Defense-in-depth: the app only ever accesses the database via the
-- service_role key (see lib/supabase.ts), which always bypasses RLS. This
-- blocks any accidental use of an anon/authenticated key against these
-- tables with zero functional impact on the app.
ALTER TABLE public.mail_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_audit_events ENABLE ROW LEVEL SECURITY;
