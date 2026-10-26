DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef AND p.prokind='f'
      AND p.proname NOT IN ('public_company','public_offers','public_ui_flags','track_shipment','track_quote','has_role','is_staff','admin_exists','otp_channel','whatsapp_ready','can_access_pincode','can_access_bag','manages_state')
      AND pg_get_function_result(p.oid) <> 'trigger'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
  END LOOP;
END $$;