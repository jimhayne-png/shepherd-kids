-- Remove NOT NULL constraint on season_id in tables that no longer require a season context.
-- Seasons feature has been removed from the application layer; these columns are preserved
-- for historical data but new records no longer carry a season_id.

alter table children_ministry_attendance alter column season_id drop not null;
alter table children_ministry_parent_updates alter column season_id drop not null;
