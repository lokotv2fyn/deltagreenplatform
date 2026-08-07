-- Migration 016: editable stat point cap
-- Handler-editable per-group budget shown by the character sheet stats total counter.
-- See PLAN.md Phase 1, item 1.

alter table group_settings
  add column stat_point_cap integer not null default 72;
