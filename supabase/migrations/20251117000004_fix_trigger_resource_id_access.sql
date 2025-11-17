-- Fix trigger function to use dynamic SQL for all NEW field accesses
-- PostgreSQL evaluates all CASE branches, causing errors when fields don't exist

DROP FUNCTION IF EXISTS public.log_chat_activity() CASCADE;

CREATE OR REPLACE FUNCTION public.log_chat_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email text;
  v_session_title text;
  v_action text;
  v_model text;
  v_token_count int;
  v_role text;
  v_resource_id uuid;
  v_organization_id uuid;
  v_user_id uuid;
BEGIN
  -- Get organization_id and user_id dynamically
  EXECUTE format('SELECT ($1).%I', 'organization_id') INTO v_organization_id USING NEW;
  EXECUTE format('SELECT ($1).%I', 'user_id') INTO v_user_id USING NEW;

  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = COALESCE(auth.uid(), v_user_id);

  -- Get session title, action, and resource_id based on table
  IF TG_TABLE_NAME = 'chat_sessions' THEN
    -- Get fields specific to chat_sessions
    EXECUTE format('SELECT ($1).%I', 'title') INTO v_session_title USING NEW;
    EXECUTE format('SELECT ($1).%I', 'id') INTO v_resource_id USING NEW;

    v_action := CASE
      WHEN TG_OP = 'INSERT' THEN 'ai_chat_session_created'
      WHEN TG_OP = 'UPDATE' THEN 'ai_chat_session_updated'
      ELSE 'ai_chat_activity'
    END;

  ELSIF TG_TABLE_NAME = 'chat_messages' THEN
    -- Get session_id for resource_id
    EXECUTE format('SELECT ($1).%I', 'session_id') INTO v_resource_id USING NEW;

    -- Get session title from chat_sessions table
    SELECT title INTO v_session_title
    FROM public.chat_sessions
    WHERE id = v_resource_id;

    -- Get message-specific fields
    EXECUTE format('SELECT ($1).%I', 'role') INTO v_role USING NEW;
    EXECUTE format('SELECT ($1).%I', 'model') INTO v_model USING NEW;
    EXECUTE format('SELECT ($1).%I', 'token_count') INTO v_token_count USING NEW;

    v_action := CASE
      WHEN v_role = 'user' THEN 'ai_chat_message_sent'
      WHEN v_role = 'assistant' THEN 'ai_chat_response_received'
      ELSE 'ai_chat_activity'
    END;

  ELSE
    v_action := 'ai_chat_activity';
    v_resource_id := NULL;
  END IF;

  -- Insert audit log entry
  INSERT INTO public.audit_logs (
    user_id,
    organization_id,
    user_email,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    COALESCE(auth.uid(), v_user_id),
    v_organization_id,
    v_user_email,
    v_action,
    TG_TABLE_NAME,
    v_resource_id,
    jsonb_build_object(
      'session_title', v_session_title,
      'model', v_model,
      'token_count', v_token_count
    ),
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_chat_activity IS
  'Trigger function to audit chat activity. Uses dynamic SQL to handle different table schemas.';

-- Recreate triggers
DROP TRIGGER IF EXISTS trg_audit_chat_session_create ON public.chat_sessions;
CREATE TRIGGER trg_audit_chat_session_create
AFTER INSERT ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.log_chat_activity();

DROP TRIGGER IF EXISTS trg_audit_chat_message_create ON public.chat_messages;
CREATE TRIGGER trg_audit_chat_message_create
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.log_chat_activity();

COMMENT ON TRIGGER trg_audit_chat_session_create ON public.chat_sessions IS
  'Audits chat session creation events';

COMMENT ON TRIGGER trg_audit_chat_message_create ON public.chat_messages IS
  'Audits chat message creation events';
