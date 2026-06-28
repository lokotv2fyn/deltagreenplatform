-- Reset: fjern alt DG Platform-indhold fra databasen.
-- Kør dette i SQL Editor for at starte forfra, derefter kør 001_initial_schema.sql.

-- Tabeller (cascade fjerner automatisk alle triggers og policies på dem)
drop table if exists activity_log cascade;
drop table if exists private_notes cascade;
drop table if exists card_assets cascade;
drop table if exists group_assets cascade;
drop table if exists group_settings cascade;
drop table if exists chain_state cascade;
drop table if exists chain_links cascade;
drop table if exists card_positions cascade;
drop table if exists cards cascade;
drop table if exists sessions cascade;
drop table if exists group_members cascade;
drop table if exists groups cascade;
drop table if exists profiles cascade;

-- Trigger på auth.users skal droppes eksplicit (vi dropper ikke auth.users selv)
drop trigger if exists on_auth_user_created on auth.users;

-- Funktioner
drop function if exists handle_new_user() cascade;
drop function if exists log_position_change() cascade;
drop function if exists log_chain_change() cascade;
drop function if exists log_note_change() cascade;
drop function if exists is_superadmin() cascade;
drop function if exists can_create_groups_self() cascade;
drop function if exists is_handler(uuid) cascade;
drop function if exists session_active(uuid) cascade;
drop function if exists stop_session(uuid) cascade;
drop function if exists start_new_session(uuid, text) cascade;
