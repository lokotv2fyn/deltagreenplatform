-- Fix weak randomness for invite codes.
-- 1. Fix the column default to use gen_random_bytes (CSPRNG) instead of random().
-- 2. Add regenerate_invite_code() RPC so the browser never generates codes.
alter table groups
  alter column invite_code set default encode(gen_random_bytes(6), 'hex');

create or replace function regenerate_invite_code(group_id uuid)
returns table(invite_code text, invite_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
  new_expires timestamptz;
begin
  if not is_handler(group_id) then
    raise exception 'not_handler';
  end if;
  new_code := encode(gen_random_bytes(6), 'hex');
  new_expires := now() + interval '7 days';
  update groups g
    set invite_code = new_code, invite_expires_at = new_expires
    where g.id = group_id;
  return query select new_code, new_expires;
end;
$$;
