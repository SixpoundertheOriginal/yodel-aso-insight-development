-- Fix chat audit logging to use correct column name
-- The audit_logs table uses 'details' not 'metadata'

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
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = COALESCE(auth.uid(), NEW.user_id);

  -- Get session title and set action based on table
  IF TG_TABLE_NAME = 'chat_sessions' THEN
    v_session_title := NEW.title;
    v_action := CASE
      WHEN TG_OP = 'INSERT' THEN 'ai_chat_session_created'
      WHEN TG_OP = 'UPDATE' THEN 'ai_chat_session_updated'
      ELSE 'ai_chat_activity'
    END;
  ELSIF TG_TABLE_NAME = 'chat_messages' THEN
    SELECT title INTO v_session_title
    FROM public.chat_sessions
    WHERE id = NEW.session_id;

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
  END IF;

  -- Insert audit log entry using 'details' instead of 'metadata'
  INSERT INTO public.audit_logs (
    user_id,
    organization_id,
    user_email,
    action,
    resource_type,
    resource_id,
    details,  -- FIXED: was 'metadata', now 'details'
    ip_address,
    user_agent
  ) VALUES (
    COALESCE(auth.uid(), NEW.user_id),  -- Use user_id if auth.uid() is null (service role)
    NEW.organization_id,
    v_user_email,
    v_action,
    TG_TABLE_NAME,
    CASE
      WHEN TG_TABLE_NAME = 'chat_sessions' THEN NEW.id
      WHEN TG_TABLE_NAME = 'chat_messages' THEN NEW.session_id
    END,
    jsonb_build_object(
      'session_title', v_session_title,
      'model', v_model,
      'token_count', v_token_count
    ),
    NULL, -- IP address (set by Edge Function if needed)
    NULL  -- User agent (set by Edge Function if needed)
  );

  RETURN NEW;
END;
$$;

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
