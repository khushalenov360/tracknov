-- Add assignments_locked column to projects table to support locking/unlocking contributor assignments
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS assignments_locked boolean NOT NULL DEFAULT false;
