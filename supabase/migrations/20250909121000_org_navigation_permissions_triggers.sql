-- Audit logging triggers for permission changes

CREATE OR REPLACE FUNCTION public.log_permission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_action TEXT := TG_OP;
  v_org UUID;
  v_user UUID;
  v_route TEXT;
  v_old BOOLEAN;
  v_new BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'org_navigation_permissions' THEN
    IF (TG_OP = 'INSERT') THEN
      v_org := NEW.organization_id; v_route := NEW.route; v_new := NEW.allowed; v_old := NULL; v_user := NULL;
    ELSIF (TG_OP = 'UPDATE') THEN
      v_org := NEW.organization_id; v_route := NEW.route; v_new := NEW.allowed; v_old := OLD.allowed; v_user := NULL;
    ELSE
      v_org := OLD.organization_id; v_route := OLD.route; v_new := NULL; v_old := OLD.allowed; v_user := NULL;
    END IF;
  ELSIF TG_TABLE_NAME = 'user_navigation_overrides' THEN
    IF (TG_OP = 'INSERT') THEN
      v_org := NEW.organization_id; v_user := NEW.user_id; v_route := NEW.route; v_new := NEW.allowed; v_old := NULL;
    ELSIF (TG_OP = 'UPDATE') THEN
      v_org := NEW.organization_id; v_user := NEW.user_id; v_route := NEW.route; v_new := NEW.allowed; v_old := OLD.allowed;
    ELSE
      v_org := OLD.organization_id; v_user := OLD.user_id; v_route := OLD.route; v_new := NULL; v_old := OLD.allowed;
    END IF;
  END IF;

  INSERT INTO public.permission_audit_logs(actor_id, organization_id, user_id, action, route, old_value, new_value)
  VALUES (v_actor, v_org, v_user, v_action, v_route, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_org_nav_perms ON public.org_navigation_permissions;
CREATE TRIGGER trg_audit_org_nav_perms
AFTER INSERT OR UPDATE OR DELETE ON public.org_navigation_permissions
FOR EACH ROW EXECUTE FUNCTION public.log_permission_change();

DROP TRIGGER IF EXISTS trg_audit_user_nav_overrides ON public.user_navigation_overrides;
CREATE TRIGGER trg_audit_user_nav_overrides
AFTER INSERT OR UPDATE OR DELETE ON public.user_navigation_overrides
FOR EACH ROW EXECUTE FUNCTION public.log_permission_change();

