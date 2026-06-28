-- Tilføj tabeller til Supabase Realtime publikation
-- Uden dette sender postgres_changes ALDRIG events for disse tabeller,
-- og spillere skal refreshe for at se ændringer.
alter publication supabase_realtime add table cards;
alter publication supabase_realtime add table card_positions;
alter publication supabase_realtime add table chain_links;
alter publication supabase_realtime add table chain_state;
