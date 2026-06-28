-- Handler-only RPC for reading invite_code.
-- The groups_select_member RLS policy cannot filter by column, so without this
-- RPC any group member could read invite_code directly via the REST API.
-- This function enforces the role check server-side.
create or replace function get_invite_code(group_id uuid)
returns table(invite_code text, invite_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_handler(group_id) then
    raise exception 'not_handler';
  end if;
  return query
    select g.invite_code, g.invite_expires_at
    from groups g
    where g.id = group_id;
end;
$$;
