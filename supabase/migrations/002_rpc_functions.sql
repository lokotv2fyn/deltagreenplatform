-- Migration 002: RPC-funktioner til gruppe-oprettelse og invite-join
-- Kør i Supabase SQL Editor efter 001_initial_schema.sql

-- ─── Hjælpefunktion: er brugeren medlem af denne gruppe? ─────────────────────
-- Bruges i RLS for at undgå rekursiv policy på group_members.

create function is_group_member(g uuid) returns boolean as $$
  select exists (
    select 1 from public.group_members
    where group_id = g and user_id = auth.uid()
  );
$$ language sql security definer set search_path = public;

-- ─── Ret members_select-policy (var rekursiv) ─────────────────────────────────

drop policy if exists "members_select" on group_members;

create policy "members_select" on group_members for select using (
  is_group_member(group_id)
);

-- ─── Ret members_insert-policy (tillod 'handler'-rolle fra klienten) ──────────

drop policy if exists "members_insert_self" on group_members;

-- Direkte klient-inserts må kun give 'player'-rolle.
-- Handler-membership sættes kun via create_group() nedenfor (security definer).
create policy "members_insert_player" on group_members for insert with check (
  user_id = auth.uid() and role = 'player'
);

-- ─── create_group: atomisk gruppe-oprettelse med handler-rolle ────────────────

create function create_group(group_name text, group_description text default '')
returns uuid as $$
declare
  new_id uuid;
begin
  if not can_create_groups_self() then
    raise exception 'Du har ikke tilladelse til at oprette grupper';
  end if;

  insert into public.groups (name, description, created_by)
  values (group_name, group_description, auth.uid())
  returning id into new_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_id, auth.uid(), 'handler');

  insert into public.group_settings (group_id)
  values (new_id);

  return new_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ─── join_group: validér invite-kode og tilmeld som spiller ──────────────────

create function join_group(invite text) returns uuid as $$
declare
  target_id uuid;
begin
  select id into target_id
  from public.groups
  where invite_code = invite
    and (invite_expires_at is null or invite_expires_at > now());

  if target_id is null then
    raise exception 'Ugyldigt eller udløbet invite-link';
  end if;

  -- Idempotent: gør ingenting hvis brugeren allerede er medlem
  insert into public.group_members (group_id, user_id, role)
  values (target_id, auth.uid(), 'player')
  on conflict (group_id, user_id) do nothing;

  return target_id;
end;
$$ language plpgsql security definer set search_path = public;
