-- Allowlist of emails that may request a magic link.
-- Checked server-side in the request-magic-link Edge Function.
-- Add emails via Supabase dashboard: Table Editor → allowed_emails → Insert row.
create table allowed_emails (
  email text primary key,
  note  text,
  created_at timestamptz default now()
);

alter table allowed_emails enable row level security;

-- Only superadmins can read/manage via the app (edge function bypasses RLS via service role).
create policy "allowed_emails_superadmin_only" on allowed_emails
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_superadmin = true)
  );

-- Seed: add your own email so you are not locked out.
insert into allowed_emails (email, note) values ('loko@tv2fyn.dk', 'superadmin');
