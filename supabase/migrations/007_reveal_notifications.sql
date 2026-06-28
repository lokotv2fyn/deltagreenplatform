-- Notifikationstabel til reveal-interrupts.
-- Broadcast er ikke pålidelig på kanaler med postgres_changes.
-- Denne tabel bruges som event-bus: handler inserter, spillere modtager via realtime.
create table if not exists reveal_notifications (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  created_at timestamptz default now()
);

alter table reveal_notifications enable row level security;
alter publication supabase_realtime add table reveal_notifications;

-- Alle gruppemedlemmer kan læse notifikationer
create policy "group_members_select_reveal_notifications"
  on reveal_notifications for select to authenticated
  using (exists (
    select 1 from group_members
    where group_id = reveal_notifications.group_id
    and user_id = auth.uid()
  ));

-- Kun handler må oprette notifikationer
create policy "handler_insert_reveal_notifications"
  on reveal_notifications for insert to authenticated
  with check (exists (
    select 1 from group_members
    where group_id = reveal_notifications.group_id
    and user_id = auth.uid()
    and role = 'handler'
  ));
