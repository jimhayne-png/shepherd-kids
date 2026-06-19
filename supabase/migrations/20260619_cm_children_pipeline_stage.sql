alter table cm_visitor_children
  add column if not exists pipeline_stage text;

create index if not exists idx_cm_visitor_children_church_pipeline_stage
  on cm_visitor_children(church_id, pipeline_stage);
