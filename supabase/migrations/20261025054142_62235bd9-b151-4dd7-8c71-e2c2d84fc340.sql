ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS show_phone_tab_bar boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.public_ui_flags() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('show_phone_tab_bar', coalesce((SELECT show_phone_tab_bar FROM app_settings WHERE id), true))
$$;
GRANT EXECUTE ON FUNCTION public.public_ui_flags() TO anon, authenticated;