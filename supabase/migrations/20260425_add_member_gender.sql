-- Add gender column to members table for ministry auto-population
-- birthdate already exists and is used for age-based ministry assignment
alter table members add column if not exists gender text;
