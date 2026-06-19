-- Backfill existing nulls so every child has a stage from the start.
update cm_visitor_children
set pipeline_stage = 'visitor'
where pipeline_stage is null;

-- New children default to visitor unless explicitly set.
alter table cm_visitor_children
  alter column pipeline_stage set default 'visitor';
