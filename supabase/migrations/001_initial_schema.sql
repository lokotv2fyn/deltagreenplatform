-- DG Platform — initial schema
-- Kør dette i Supabase SQL Editor (eller via Supabase CLI: supabase db push)

-- ─── Profiler ─────────────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  is_superadmin boolean default false,
  can_create_groups boolean default false,
  created_at timestamptz default now()
);

-- Opret profil automatisk når en bruger registrerer sig
create function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Grupper ──────────────────────────────────────────────────────────────────

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  created_by uuid references profiles(id),
  invite_code text unique default substr(md5(random()::text), 1, 8),
  invite_expires_at timestamptz,
  current_session_id uuid, -- FK tilføjes nedenfor efter sessions er oprettet
  created_at timestamptz default now()
);

-- ─── Medlemskab ───────────────────────────────────────────────────────────────

create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('handler', 'player')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- ─── Sessions ─────────────────────────────────────────────────────────────────

create table sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  label text,
  status text default 'active' check (status in ('active','paused','ended')),
  auto_reveal_override boolean, -- null = brug group_settings
  started_at timestamptz default now(),
  ended_at timestamptz,
  created_at timestamptz default now()
);

-- Tilføj FK nu hvor sessions eksisterer
alter table groups
  add constraint groups_current_session_id_fkey
  foreign key (current_session_id) references sessions(id);

-- ─── Hjælpefunktioner (bruges i RLS) ─────────────────────────────────────────
-- Alle er security definer for at undgå rekursive RLS-opslag.

create function is_superadmin() returns boolean as $$
  select coalesce(
    (select is_superadmin from public.profiles where id = auth.uid()),
    false
  );
$$ language sql security definer set search_path = public;

-- Returnerer can_create_groups for den aktuelle bruger uden at gå gennem RLS.
create function can_create_groups_self() returns boolean as $$
  select coalesce(
    (select can_create_groups from public.profiles where id = auth.uid()),
    false
  );
$$ language sql security definer set search_path = public;

create function is_handler(g uuid) returns boolean as $$
  select exists (
    select 1 from public.group_members
    where group_id = g and user_id = auth.uid() and role = 'handler'
  );
$$ language sql security definer set search_path = public;

create function session_active(g uuid) returns boolean as $$
  select exists (
    select 1 from public.groups gr join public.sessions s on s.id = gr.current_session_id
    where gr.id = g and s.status = 'active'
  );
$$ language sql security definer set search_path = public;

-- ─── Kort ─────────────────────────────────────────────────────────────────────

create table cards (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  type text not null,
  label text not null,
  data jsonb not null default '{}',
  origin text not null default 'handler' check (origin in ('handler','player')),
  created_by uuid references profiles(id),
  revealed boolean default false,
  pinned boolean default false,
  created_at timestamptz default now()
);

-- ─── Kortpositioner (delt board) ──────────────────────────────────────────────

create table card_positions (
  card_id uuid primary key references cards(id) on delete cascade,
  x real default 0,
  y real default 0,
  z_index int default 0,
  minimized boolean default true,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

-- ─── Rød tråd ─────────────────────────────────────────────────────────────────

create table chain_links (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  card_id uuid references cards(id) on delete cascade,
  position int not null,
  added_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table chain_state (
  group_id uuid primary key references groups(id) on delete cascade,
  hidden boolean default false
);

-- ─── Gruppe-indstillinger ─────────────────────────────────────────────────────

create table group_settings (
  group_id uuid primary key references groups(id) on delete cascade,
  auto_reveal_player_cards boolean default true,
  settings jsonb default '{}'
);

-- ─── Assets ───────────────────────────────────────────────────────────────────

create table group_assets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  uploaded_by uuid references profiles(id),
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  kind text not null check (kind in ('pdf', 'image', 'markdown', 'text')),
  created_at timestamptz default now()
);

create table card_assets (
  card_id uuid references cards(id) on delete cascade,
  asset_id uuid references group_assets(id) on delete cascade,
  primary key (card_id, asset_id)
);

-- ─── Aktivitetslog ────────────────────────────────────────────────────────────

create table activity_log (
  id bigint generated always as identity primary key,
  group_id uuid references groups(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  actor_id uuid references profiles(id),
  action text not null,
  target_table text not null,
  target_id uuid,
  details jsonb default '{}',
  created_at timestamptz default now()
);

-- ─── Private noter ────────────────────────────────────────────────────────────

create table private_notes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  card_id uuid references cards(id) on delete set null,
  body text not null default '',
  updated_at timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table sessions enable row level security;
alter table cards enable row level security;
alter table card_positions enable row level security;
alter table chain_links enable row level security;
alter table chain_state enable row level security;
alter table group_settings enable row level security;
alter table group_assets enable row level security;
alter table card_assets enable row level security;
alter table activity_log enable row level security;
alter table private_notes enable row level security;

-- profiles
create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_update_own" on profiles for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and (is_superadmin() or can_create_groups = can_create_groups_self())
  );
create policy "profiles_superadmin_manage" on profiles for all using (is_superadmin());

-- groups
create policy "groups_select_member" on groups for select using (
  exists (select 1 from group_members where group_id = groups.id and user_id = auth.uid())
);
create policy "groups_insert_authorized" on groups for insert with check (
  created_by = auth.uid()
  and can_create_groups_self()
);
create policy "groups_update_handler" on groups for update using (is_handler(id));

-- group_members
create policy "members_select" on group_members for select using (
  exists (select 1 from group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid())
);
create policy "members_insert_self" on group_members for insert with check (user_id = auth.uid());

-- sessions
create policy "sessions_select_member" on sessions for select using (
  exists (select 1 from group_members where group_id = sessions.group_id and user_id = auth.uid())
);
create policy "sessions_write_handler" on sessions for all using (is_handler(group_id));

-- cards
create policy "cards_select" on cards for select using (
  is_handler(group_id)
  or created_by = auth.uid()
  or (revealed = true and exists (
    select 1 from group_members where group_id = cards.group_id and user_id = auth.uid()
  ))
);
create policy "cards_insert_player" on cards for insert with check (
  origin = 'player'
  and created_by = auth.uid()
  and session_active(group_id)
  and exists (select 1 from group_members where group_id = cards.group_id and user_id = auth.uid())
);
create policy "cards_insert_handler" on cards for insert with check (is_handler(group_id));
create policy "cards_update_handler" on cards for update using (is_handler(group_id));
create policy "cards_delete_handler" on cards for delete using (is_handler(group_id));

-- card_positions
create policy "positions_select" on card_positions for select using (
  exists (
    select 1 from cards c join group_members gm on gm.group_id = c.group_id
    where c.id = card_positions.card_id and gm.user_id = auth.uid()
  )
);
create policy "positions_write" on card_positions for all using (
  exists (
    select 1 from cards c join group_members gm on gm.group_id = c.group_id
    where c.id = card_positions.card_id and gm.user_id = auth.uid()
    and (is_handler(c.group_id) or session_active(c.group_id))
  )
);

-- chain_links
create policy "chain_select" on chain_links for select using (
  exists (select 1 from group_members where group_id = chain_links.group_id and user_id = auth.uid())
);
create policy "chain_write" on chain_links for all using (
  exists (select 1 from group_members where group_id = chain_links.group_id and user_id = auth.uid())
  and (is_handler(chain_links.group_id) or session_active(chain_links.group_id))
);

-- chain_state
create policy "chain_state_select" on chain_state for select using (
  exists (select 1 from group_members where group_id = chain_state.group_id and user_id = auth.uid())
);
create policy "chain_state_write_handler" on chain_state for all using (is_handler(group_id));

-- group_settings
create policy "settings_handler_only" on group_settings for all using (is_handler(group_id));

-- group_assets
create policy "assets_select" on group_assets for select using (
  exists (select 1 from group_members where group_id = group_assets.group_id and user_id = auth.uid())
);
create policy "assets_write_handler_only" on group_assets for all using (is_handler(group_id));

-- card_assets
create policy "card_assets_select" on card_assets for select using (
  exists (select 1 from cards c where c.id = card_assets.card_id)
);
create policy "card_assets_write_handler_only" on card_assets for all using (
  exists (select 1 from cards c where c.id = card_assets.card_id and is_handler(c.group_id))
);

-- activity_log
create policy "activity_handler_only" on activity_log for select using (is_handler(group_id));

-- private_notes
create policy "notes_select" on private_notes for select using (
  author_id = auth.uid() or is_handler(group_id)
);
create policy "notes_write" on private_notes for insert with check (
  author_id = auth.uid() and (is_handler(group_id) or session_active(group_id))
);
create policy "notes_update" on private_notes for update using (
  author_id = auth.uid() and (is_handler(group_id) or session_active(group_id))
);

-- ─── Triggers ─────────────────────────────────────────────────────────────────

-- Logger positionsændringer i activity_log
create function log_position_change() returns trigger as $$
declare
  g uuid;
begin
  select c.group_id into g from cards c where c.id = new.card_id;
  insert into activity_log (group_id, session_id, actor_id, action, target_table, target_id, details)
  values (
    g,
    (select current_session_id from groups where id = g),
    auth.uid(),
    case
      when new.minimized and not old.minimized then 'card_minimized'
      when not new.minimized and old.minimized then 'card_restored'
      else 'position_moved'
    end,
    'card_positions',
    new.card_id,
    jsonb_build_object(
      'from', jsonb_build_object('x', old.x, 'y', old.y),
      'to',   jsonb_build_object('x', new.x, 'y', new.y)
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_log_position_change
  after update on card_positions
  for each row execute function log_position_change();

-- Logger chain_link insert/delete
create function log_chain_change() returns trigger as $$
begin
  insert into activity_log (group_id, session_id, actor_id, action, target_table, target_id, details)
  values (
    coalesce(new.group_id, old.group_id),
    (select current_session_id from groups where id = coalesce(new.group_id, old.group_id)),
    auth.uid(),
    case when tg_op = 'INSERT' then 'chain_added' else 'chain_removed' end,
    'chain_links',
    coalesce(new.card_id, old.card_id),
    '{}'
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger trg_log_chain_insert
  after insert on chain_links
  for each row execute function log_chain_change();

create trigger trg_log_chain_delete
  after delete on chain_links
  for each row execute function log_chain_change();

-- Logger note-opdateringer (ikke selve teksten)
create function log_note_change() returns trigger as $$
begin
  insert into activity_log (group_id, session_id, actor_id, action, target_table, target_id, details)
  values (
    new.group_id,
    (select current_session_id from groups where id = new.group_id),
    auth.uid(),
    case when tg_op = 'INSERT' then 'note_created' else 'note_updated' end,
    'private_notes',
    new.id,
    '{}'  -- teksten logges aldrig
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_log_note_change
  after insert or update on private_notes
  for each row execute function log_note_change();

-- ─── Session RPC-funktioner ───────────────────────────────────────────────────

create function stop_session(target_group uuid) returns void as $$
begin
  if not is_handler(target_group) then
    raise exception 'kun Handler kan stoppe en session';
  end if;
  update sessions set status = 'paused'
  where id = (select current_session_id from groups where id = target_group);
end;
$$ language plpgsql security invoker;

create function start_new_session(target_group uuid, new_label text default null) returns uuid as $$
declare
  new_id uuid;
begin
  if not is_handler(target_group) then
    raise exception 'kun Handler kan starte en ny session';
  end if;
  update sessions set status = 'ended', ended_at = now()
  where id = (select current_session_id from groups where id = target_group);
  insert into sessions (group_id, label, status)
  values (target_group, new_label, 'active')
  returning id into new_id;
  update groups set current_session_id = new_id where id = target_group;
  return new_id;
end;
$$ language plpgsql security invoker;
