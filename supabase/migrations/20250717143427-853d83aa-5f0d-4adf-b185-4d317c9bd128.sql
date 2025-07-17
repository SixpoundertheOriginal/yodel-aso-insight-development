-- Add processing_metadata column to chatgpt_audit_runs table for state persistence
ALTER TABLE public.chatgpt_audit_runs 
ADD COLUMN processing_metadata JSONB DEFAULT '{}'::jsonb;