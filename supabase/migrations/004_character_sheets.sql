create table character_sheets (
  id          uuid        primary key default gen_random_uuid(),
  group_id    uuid        not null references groups(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  data        jsonb       not null default '{}',
  updated_at  timestamptz not null default now(),
  unique (group_id, user_id)
);

alter table character_sheets enable row level security;

-- Alle gruppemedlemmer kan læse ark i gruppen (handler ser alle spilleres ark)
create policy "sheets_select" on character_sheets
  for select using (is_group_member(group_id));

-- Spillere kan kun indsætte eget ark
create policy "sheets_insert" on character_sheets
  for insert with check (user_id = auth.uid() and is_group_member(group_id));

-- Spillere kan kun opdatere eget ark
create policy "sheets_update" on character_sheets
  for update using (user_id = auth.uid());

-- Auto-timestamp
create or replace function update_sheet_timestamp()
  returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_update_sheet_timestamp
  before update on character_sheets
  for each row execute function update_sheet_timestamp();
