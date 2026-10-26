DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TYPE public.app_role AS ENUM ('admin','point','network','state_director','state_manager','area_manager');
SET check_function_bodies = false;

CREATE TABLE public.app_settings (
    id boolean DEFAULT true NOT NULL PRIMARY KEY, address text, business_hours text, cash_on_pickup boolean DEFAULT true NOT NULL, cin text, city text,
    company_name text DEFAULT 'GetXpress'::text NOT NULL, company_type text, description text, facebook_url text, footer_text text, gstin text,
    hero_image_url text, icon_url text, instagram_url text, intl_markup_flat numeric DEFAULT 0 NOT NULL, intl_markup_percent numeric DEFAULT 0 NOT NULL,
    linkedin_url text, logo_url text, maintenance_message text, meta_description text, meta_keywords text, meta_title text, og_image_url text, pan text,
    pay_account_name text, pay_account_no text, pay_bank_name text, pay_ifsc text, pay_instructions text, pay_upi_id text, pay_upi_name text, pincode text,
    site_live boolean DEFAULT true NOT NULL, state text, support_email text, support_phone text, support_whatsapp text, tagline text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL, x_url text, youtube_url text, hub_commission_percent numeric DEFAULT 10 NOT NULL,
    CONSTRAINT app_settings_id_check CHECK (id));
CREATE TABLE public.audit_logs (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, action text NOT NULL, actor text, entity text NOT NULL, entity_id text, meta jsonb DEFAULT '{}'::jsonb NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE SEQUENCE public.awb_seq START WITH 100001;
CREATE SEQUENCE public.bag_seq START WITH 1;
CREATE SEQUENCE public.manifest_seq START WITH 1;
CREATE SEQUENCE public.piece_seq START WITH 1;
CREATE TABLE public.manifests (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, manifest_code text NOT NULL UNIQUE, created_by uuid DEFAULT auth.uid() NOT NULL, from_location text NOT NULL, to_location text NOT NULL, vehicle_no text, status text DEFAULT 'open'::text NOT NULL, received_at timestamp with time zone, received_by text, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.bags (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, bag_code text NOT NULL UNIQUE, created_by uuid DEFAULT auth.uid() NOT NULL, destination text NOT NULL, manifest_id uuid REFERENCES public.manifests(id) ON DELETE SET NULL, plastic_bag_code text, seal_no text, sealed_at timestamp with time zone, status text DEFAULT 'open'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.profiles (id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, account_type text DEFAULT 'individual'::text NOT NULL, address text, age numeric, avatar_url text, business_name text, city text, contact_email text, district text, first_name text, last_name text, full_name text, gender text, last_seen_at timestamp with time zone, lat numeric, lng numeric, onboarded_at timestamp with time zone, phone text, phone_verified boolean DEFAULT false NOT NULL, pincode text, state text, whatsapp text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.shipments (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, user_id uuid DEFAULT auth.uid() NOT NULL REFERENCES public.profiles(id), tracking_number text NOT NULL UNIQUE, contents text, coupon_code text, declared_value numeric, dims jsonb, discount numeric DEFAULT 0 NOT NULL, handling_fee numeric DEFAULT 0 NOT NULL, has_electronics boolean DEFAULT false NOT NULL, is_fragile boolean DEFAULT false NOT NULL, origin_point_id uuid, parcel_photos text[] DEFAULT '{}'::text[] NOT NULL, payment_method text DEFAULT 'cash'::text NOT NULL, payment_status text DEFAULT 'pending'::text NOT NULL, pickup_lat numeric, pickup_lng numeric, pieces_count numeric DEFAULT 1 NOT NULL, policy_accepted_at timestamp with time zone, price numeric NOT NULL, receiver_name text NOT NULL, receiver_phone text NOT NULL, receiver_email text, receiver_address text NOT NULL, receiver_city text NOT NULL, receiver_district text, receiver_state text, receiver_pincode text NOT NULL, sender_name text NOT NULL, sender_phone text NOT NULL, sender_email text, sender_address text NOT NULL, sender_city text NOT NULL, sender_district text, sender_state text, sender_pincode text NOT NULL, routing_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL, service text DEFAULT 'standard'::text NOT NULL, status text DEFAULT 'booked'::text NOT NULL, weight_kg numeric NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.shipment_pieces (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE, piece_code text NOT NULL UNIQUE, seq_no numeric NOT NULL, total numeric NOT NULL, box_preset text, contents text, dims jsonb, weight_kg numeric, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.bag_items (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, bag_id uuid NOT NULL REFERENCES public.bags(id) ON DELETE CASCADE, piece_id uuid NOT NULL REFERENCES public.shipment_pieces(id) ON DELETE CASCADE, added_by text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.coupons (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, code text NOT NULL UNIQUE, active boolean DEFAULT true NOT NULL, created_by uuid, description text, discount_type text DEFAULT 'flat'::text NOT NULL, discount_value numeric NOT NULL, expires_at timestamp with time zone, max_discount numeric, max_uses numeric, min_order numeric DEFAULT 0 NOT NULL, per_user_limit numeric DEFAULT 1 NOT NULL, starts_at timestamp with time zone DEFAULT now() NOT NULL, used_count numeric DEFAULT 0 NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, show_on_site boolean DEFAULT true NOT NULL, is_private_reward boolean DEFAULT false NOT NULL);
CREATE TABLE public.coupon_redemptions (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE, discount numeric NOT NULL, shipment_id uuid NOT NULL, user_id uuid DEFAULT auth.uid() NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.courier_provider_settings (provider text NOT NULL PRIMARY KEY, account_label text, enabled boolean DEFAULT false NOT NULL, environment text DEFAULT 'sandbox'::text NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.email_logs (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, to_email text NOT NULL, subject text, template_key text, status text NOT NULL, error text, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.email_templates (key text NOT NULL PRIMARY KEY, name text NOT NULL, subject text NOT NULL, body text NOT NULL, enabled boolean DEFAULT true NOT NULL, image_url text, kind text DEFAULT 'transactional'::text NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.first_order_rewards (user_id uuid NOT NULL PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.gateway_configs (category text NOT NULL, provider text NOT NULL, config jsonb DEFAULT '{}'::jsonb NOT NULL, enabled boolean DEFAULT false NOT NULL, live_mode boolean DEFAULT false NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, updated_by text, PRIMARY KEY (category, provider));
CREATE TABLE public.health_checks (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, status text NOT NULL, details jsonb DEFAULT '{}'::jsonb NOT NULL, latency_ms numeric, checked_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.hub_routes (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, from_location text NOT NULL, to_location text NOT NULL, pincodes text[] DEFAULT '{}'::text[] NOT NULL, owner_user_id uuid, active boolean DEFAULT true NOT NULL, created_by uuid, created_at timestamp with time zone DEFAULT now() NOT NULL, UNIQUE (from_location, to_location));
CREATE TABLE public.integration_settings (id boolean DEFAULT true NOT NULL PRIMARY KEY, admin_alert_email text, alert_on_application boolean DEFAULT true NOT NULL, alert_on_booking boolean DEFAULT true NOT NULL, api_enabled boolean DEFAULT false NOT NULL, otp_provider text DEFAULT 'test'::text NOT NULL, otp_sender_id text, payment_key_id text, payment_live boolean DEFAULT false NOT NULL, payment_provider text DEFAULT 'manual'::text NOT NULL, smtp_from text, smtp_host text, smtp_port numeric, smtp_provider text DEFAULT 'custom'::text NOT NULL, smtp_user text, updated_at timestamp with time zone DEFAULT now() NOT NULL, webhook_url text, whatsapp_enabled boolean DEFAULT false NOT NULL, whatsapp_number text, CONSTRAINT integration_settings_id_check CHECK (id));
CREATE TABLE public.international_quote_requests (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, user_id uuid DEFAULT auth.uid() NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, reference text DEFAULT ('GXI'::text || upper(substr(md5((random())::text), 1, 8))) NOT NULL UNIQUE, sender jsonb NOT NULL, receiver jsonb NOT NULL, contents text NOT NULL, declared_value numeric DEFAULT 0 NOT NULL, weight_kg numeric NOT NULL, status text DEFAULT 'pending'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, booking jsonb, booked_at timestamp with time zone, quoted_price numeric, service_name text, carrier_awb text, history jsonb DEFAULT '[]'::jsonb NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.label_prints (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, piece_id uuid NOT NULL REFERENCES public.shipment_pieces(id) ON DELETE CASCADE, printed_by text NOT NULL, reason text, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.login_otps (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, phone text NOT NULL, code_hash text NOT NULL, attempts numeric DEFAULT 0 NOT NULL, consumed_at timestamp with time zone, expires_at timestamp with time zone NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.notifications (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, user_id uuid, kind text NOT NULL, channel text DEFAULT 'email'::text NOT NULL, recipient text, subject text NOT NULL, body text NOT NULL, meta jsonb DEFAULT '{}'::jsonb NOT NULL, status text DEFAULT 'pending'::text NOT NULL, error text, sent_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.parcel_presets (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, label text NOT NULL, label_hi text, kind text DEFAULT 'box'::text NOT NULL, l numeric DEFAULT 0 NOT NULL, w numeric DEFAULT 0 NOT NULL, h numeric DEFAULT 0 NOT NULL, max_kg numeric DEFAULT 0 NOT NULL, fee numeric DEFAULT 0 NOT NULL, sort numeric DEFAULT 0 NOT NULL, active boolean DEFAULT true NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, code text);
CREATE UNIQUE INDEX parcel_presets_code_key ON public.parcel_presets (code);
CREATE TABLE public.payments (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, user_id uuid DEFAULT auth.uid() NOT NULL, shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE, amount numeric NOT NULL, method text, mode text DEFAULT 'test'::text NOT NULL, provider text DEFAULT 'manual'::text NOT NULL, provider_ref text, status text DEFAULT 'pending'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.phone_otps (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, user_id uuid NOT NULL, phone text NOT NULL, code_hash text NOT NULL, attempts numeric DEFAULT 0 NOT NULL, consumed_at timestamp with time zone, expires_at timestamp with time zone NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.pincodes (pincode text NOT NULL PRIMARY KEY, city text NOT NULL, state text NOT NULL, area text, hub_name text, tier text, zone text, active boolean DEFAULT true NOT NULL);
CREATE TABLE public.pincode_allocations (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, pincode text NOT NULL REFERENCES public.pincodes(pincode) ON DELETE CASCADE, holder_user_id uuid NOT NULL, holder_role public.app_role NOT NULL, area text, note text, assigned_by text DEFAULT ''::text NOT NULL, effective_from text DEFAULT ((now())::date)::text NOT NULL, effective_to text, status text DEFAULT 'active'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.point_applications (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, user_id uuid, full_name text NOT NULL, phone text NOT NULL, whatsapp text, email text NOT NULL, age numeric, gender text, business_name text NOT NULL, business_type text NOT NULL, address text NOT NULL, address_line2 text, city text NOT NULL, district text, state text NOT NULL, pincode text NOT NULL, daily_capacity numeric, space_sqft numeric, message text, reference text DEFAULT ('GXP'::text || upper(substr(md5((random())::text), 1, 8))) NOT NULL, status text DEFAULT 'pending'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.point_commissions (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, point_user_id uuid NOT NULL, shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE, amount numeric NOT NULL, rate numeric NOT NULL, status text DEFAULT 'pending'::text NOT NULL, settled_at timestamp with time zone, settled_by text, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.returns (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE, kind text NOT NULL, reason text NOT NULL, requested_by text NOT NULL, pickup_at timestamp with time zone, restocking_status text DEFAULT 'pending'::text NOT NULL, return_awb text, status text DEFAULT 'requested'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.seal_codes (code text NOT NULL PRIMARY KEY, batch_id text NOT NULL, kind text NOT NULL, created_by uuid DEFAULT auth.uid() NOT NULL, used_bag_id uuid, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.service_rates (service text NOT NULL PRIMARY KEY, base numeric DEFAULT 0 NOT NULL, per_kg numeric DEFAULT 0 NOT NULL, active boolean DEFAULT true NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.smtp_settings (id boolean DEFAULT true NOT NULL PRIMARY KEY, enabled boolean DEFAULT false NOT NULL, from_email text, from_name text, host text DEFAULT ''::text NOT NULL, port numeric DEFAULT 587 NOT NULL, provider text DEFAULT 'custom'::text NOT NULL, secure text DEFAULT 'starttls'::text NOT NULL, username text, updated_at timestamp with time zone DEFAULT now() NOT NULL, CONSTRAINT smtp_settings_id_check CHECK (id));
CREATE TABLE public.staff_scopes (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, user_id uuid NOT NULL, role public.app_role NOT NULL, state text, point_id uuid, created_by uuid, revoked_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.state_rates (state text NOT NULL, service text NOT NULL, base numeric NOT NULL, per_kg numeric NOT NULL, active boolean DEFAULT true NOT NULL, set_by text, updated_at timestamp with time zone DEFAULT now() NOT NULL, PRIMARY KEY (state, service));
CREATE TABLE public.support_tickets (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, subject text NOT NULL, message text NOT NULL, tracking_number text, ai_answer text, staff_reply text, status text DEFAULT 'open'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_tickets_message_check CHECK (((char_length(message) >= 5) AND (char_length(message) <= 3000))),
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'answered'::text, 'resolved'::text]))),
    CONSTRAINT support_tickets_subject_check CHECK (((char_length(subject) >= 3) AND (char_length(subject) <= 140))));
CREATE TABLE public.tracking_events (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE, piece_id uuid, status text NOT NULL, location text, note text, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.user_roles (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE (user_id, role));
CREATE TABLE public.wallet_deposits (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, user_id uuid DEFAULT auth.uid() NOT NULL, amount numeric NOT NULL, method text DEFAULT 'upi'::text NOT NULL, utr text NOT NULL, proof_path text, status text DEFAULT 'pending'::text NOT NULL, admin_note text, reviewed_at timestamp with time zone, reviewed_by text, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.wallet_transactions (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, user_id uuid NOT NULL, amount numeric NOT NULL, kind text NOT NULL, note text, ref text, created_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.wallet_withdrawals (id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY, user_id uuid DEFAULT auth.uid() NOT NULL, amount numeric NOT NULL, payout_method text NOT NULL, payout_details text NOT NULL, status text DEFAULT 'pending'::text NOT NULL, admin_note text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.whatsapp_settings (id boolean DEFAULT true NOT NULL PRIMARY KEY, api_key text, base_url text DEFAULT ''::text NOT NULL, enabled boolean DEFAULT false NOT NULL, instance_id text, notify_bookings boolean DEFAULT true NOT NULL, otp_template text DEFAULT ''::text NOT NULL, webhook_secret text, updated_at timestamp with time zone DEFAULT now() NOT NULL, CONSTRAINT whatsapp_settings_id_check CHECK (id));
CREATE TABLE public.whatsapp_templates (key text NOT NULL PRIMARY KEY, name text NOT NULL, body text NOT NULL, event text DEFAULT ''::text NOT NULL, enabled boolean DEFAULT true NOT NULL, link_url text, media_url text, updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE INDEX email_logs_to_template_idx ON public.email_logs (to_email, template_key);
CREATE INDEX intl_quotes_reference_upper_idx ON public.international_quote_requests (upper(reference));
CREATE INDEX intl_quotes_user_idx ON public.international_quote_requests (user_id, created_at DESC);
CREATE INDEX shipment_pieces_code_upper_idx ON public.shipment_pieces (upper(piece_code));
CREATE INDEX shipment_pieces_shipment_idx ON public.shipment_pieces (shipment_id);
CREATE INDEX shipments_status_idx ON public.shipments (status);
CREATE INDEX shipments_tracking_upper_idx ON public.shipments (upper(tracking_number));
CREATE INDEX shipments_user_created_idx ON public.shipments (user_id, created_at DESC);
CREATE INDEX support_tickets_user_idx ON public.support_tickets (user_id, created_at DESC);
CREATE INDEX tracking_events_shipment_idx ON public.tracking_events (shipment_id, created_at DESC);
CREATE INDEX user_roles_user_idx ON public.user_roles (user_id);

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE FUNCTION public.is_staff(_u uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _u) $$;
CREATE FUNCTION public.admin_exists() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') $$;
CREATE FUNCTION public.manages_state(_state text, _user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(_user,'admin') OR EXISTS (SELECT 1 FROM public.staff_scopes WHERE user_id = _user AND revoked_at IS NULL AND lower(state) = lower(_state)) $$;

CREATE FUNCTION public.add_piece_to_bag(_bag_id uuid, _code text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.shipment_pieces; b public.bags;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO b FROM public.bags WHERE id = _bag_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bag not found'; END IF;
  IF b.status <> 'open' THEN RAISE EXCEPTION 'Bag is sealed'; END IF;
  SELECT * INTO p FROM public.shipment_pieces WHERE upper(piece_code) = upper(trim(_code));
  IF NOT FOUND THEN
    SELECT sp.* INTO p FROM public.shipment_pieces sp JOIN public.shipments s ON s.id = sp.shipment_id WHERE upper(s.tracking_number) = upper(trim(_code)) ORDER BY sp.seq_no LIMIT 1;
  END IF;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Parcel % not found', _code; END IF;
  IF EXISTS (SELECT 1 FROM public.bag_items WHERE piece_id = p.id) THEN RAISE EXCEPTION 'Parcel already bagged'; END IF;
  INSERT INTO public.bag_items(bag_id, piece_id, added_by) VALUES (_bag_id, p.id, auth.uid()::text);
  INSERT INTO public.tracking_events(shipment_id, piece_id, status, note) VALUES (p.shipment_id, p.id, 'bagged', 'Bag ' || b.bag_code);
  RETURN jsonb_build_object('piece_code', p.piece_code, 'bag_code', b.bag_code);
END $$;

CREATE FUNCTION public.admin_update_profile(_id uuid, _patch jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.profiles SET full_name = COALESCE(_patch->>'full_name', full_name), phone = COALESCE(_patch->>'phone', phone),
    contact_email = COALESCE(_patch->>'contact_email', contact_email), city = COALESCE(_patch->>'city', city),
    district = COALESCE(_patch->>'district', district), state = COALESCE(_patch->>'state', state),
    pincode = COALESCE(_patch->>'pincode', pincode), updated_at = now() WHERE id = _id;
END $$;

CREATE FUNCTION public.admin_users() RETURNS TABLE(user_id uuid, full_name text, phone text, city text, roles text[], created_at timestamp with time zone, last_seen_at timestamp with time zone) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT u.id, p.full_name, COALESCE(p.phone, u.phone::text), p.city,
    COALESCE((SELECT array_agg(r.role::text) FROM public.user_roles r WHERE r.user_id = u.id), '{}'::text[]), u.created_at, p.last_seen_at
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id ORDER BY u.created_at DESC;
END $$;

CREATE FUNCTION public.admin_wallet_adjust(_user uuid, _amount numeric, _note text) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _amount = 0 OR abs(_amount) > 1000000 THEN RAISE EXCEPTION 'Enter an amount between 1 and 10,00,000'; END IF;
  IF length(trim(COALESCE(_note,''))) < 3 THEN RAISE EXCEPTION 'Add a reason'; END IF;
  INSERT INTO public.wallet_transactions(user_id, amount, kind, note, ref) VALUES (_user, _amount, 'adjustment', trim(_note), 'ADMIN-' || left(auth.uid()::text,8));
  INSERT INTO public.audit_logs(action, actor, entity, entity_id, meta) VALUES ('wallet_adjust', auth.uid()::text, 'user', _user::text, jsonb_build_object('amount',_amount,'note',_note));
  RETURN COALESCE((SELECT sum(amount) FROM public.wallet_transactions WHERE user_id = _user), 0);
END $$;

CREATE FUNCTION public.allocate_pincode(_pincode text, _holder uuid, _holder_role public.app_role, _note text DEFAULT NULL::text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.pincode_allocations WHERE pincode = _pincode AND holder_role = _holder_role AND status = 'active') THEN
    RAISE EXCEPTION 'PIN % already allocated for this role', _pincode; END IF;
  INSERT INTO public.pincode_allocations(pincode, holder_user_id, holder_role, note, assigned_by, status)
  VALUES (_pincode, _holder, _holder_role, _note, auth.uid()::text, 'active') RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE FUNCTION public.book_international_quote(_ref text, _booking jsonb, _service text DEFAULT NULL::text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE q public.international_quote_requests;
BEGIN
  SELECT * INTO q FROM public.international_quote_requests WHERE upper(reference) = upper(trim(_ref));
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote reference not found'; END IF;
  IF q.user_id <> auth.uid() AND NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'This reference belongs to another account'; END IF;
  IF q.status NOT IN ('pending','new','reviewing','quoted') THEN RAISE EXCEPTION 'This quote is already %', replace(q.status,'_',' '); END IF;
  UPDATE public.international_quote_requests SET booking = _booking, service_name = COALESCE(nullif(trim(_service),''), service_name), booked_at = now(),
    status = 'booking_requested', updated_at = now(),
    history = history || jsonb_build_array(jsonb_build_object('status','booking_requested','note','Booking form submitted','at',now()))
  WHERE id = q.id RETURNING * INTO q;
  RETURN jsonb_build_object('reference', q.reference, 'status', q.status);
END $$;

CREATE FUNCTION public.can_access_bag(_bag uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT public.is_staff(auth.uid()) $$;
CREATE FUNCTION public.can_access_pincode(_pin text, _user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(_user,'admin') OR EXISTS (SELECT 1 FROM public.pincode_allocations WHERE pincode = _pin AND holder_user_id = _user AND status = 'active')
    OR EXISTS (SELECT 1 FROM public.pincodes p WHERE p.pincode = _pin AND public.manages_state(p.state, _user)) $$;

CREATE FUNCTION public.claim_first_admin() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR public.admin_exists() THEN RETURN false; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END $$;

CREATE FUNCTION public.create_bag(_destination text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b public.bags;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.bags(bag_code, destination, status, created_by)
  VALUES ('BG' || to_char(now(),'YYMMDD') || lpad(nextval('public.bag_seq')::text,5,'0'), _destination, 'open', auth.uid()) RETURNING * INTO b;
  RETURN to_jsonb(b);
END $$;

CREATE FUNCTION public.create_manifest(_bag_ids uuid[], _from text, _to text, _vehicle text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m public.manifests;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.manifests(manifest_code, from_location, to_location, vehicle_no, status, created_by)
  VALUES ('MF' || to_char(now(),'YYMMDD') || lpad(nextval('public.manifest_seq')::text,4,'0'), _from, _to, _vehicle, 'in_transit', auth.uid()) RETURNING * INTO m;
  UPDATE public.bags SET manifest_id = m.id, status = 'dispatched' WHERE id = ANY(_bag_ids);
  INSERT INTO public.tracking_events(shipment_id, piece_id, status, location, note)
  SELECT p.shipment_id, p.id, 'in_transit', _from, 'Manifest ' || m.manifest_code || ' to ' || _to
  FROM public.bag_items i JOIN public.shipment_pieces p ON p.id = i.piece_id WHERE i.bag_id = ANY(_bag_ids);
  RETURN to_jsonb(m);
END $$;

CREATE FUNCTION public.next_awb() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 'GX' || to_char(now(),'YYMM') || lpad(nextval('public.awb_seq')::text, 7, '0') $$;
CREATE FUNCTION public.next_piece_code() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 'PC' || to_char(now(),'YYMMDD') || lpad(nextval('public.piece_seq')::text, 6, '0') $$;

CREATE FUNCTION public.create_return(_awb text, _kind text, _reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.shipments; r public.returns;
BEGIN
  SELECT * INTO s FROM public.shipments WHERE upper(tracking_number) = upper(trim(_awb));
  IF NOT FOUND THEN RAISE EXCEPTION 'Shipment not found'; END IF;
  IF s.user_id <> auth.uid() AND NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.returns(shipment_id, kind, reason, requested_by, status, return_awb)
  VALUES (s.id, COALESCE(_kind,'rto'), _reason, auth.uid()::text, 'requested', public.next_awb()) RETURNING * INTO r;
  INSERT INTO public.tracking_events(shipment_id, status, note) VALUES (s.id, 'return_requested', _reason);
  RETURN to_jsonb(r);
END $$;

CREATE FUNCTION public.credit_approved_deposit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    NEW.reviewed_by := auth.uid()::text; NEW.reviewed_at := now();
    INSERT INTO public.wallet_transactions(user_id, amount, kind, ref, note) VALUES (NEW.user_id, NEW.amount, 'topup', 'UTR-' || NEW.utr, 'Manual deposit approved');
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    NEW.reviewed_by := auth.uid()::text; NEW.reviewed_at := now();
  ELSIF NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'Deposit already reviewed';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.dashboard_summary() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE staff boolean := public.is_staff(auth.uid()); adm boolean := public.has_role(auth.uid(),'admin');
BEGIN
  RETURN (SELECT jsonb_build_object(
    'shipments', count(*), 'total', count(*),
    'today', count(*) FILTER (WHERE created_at::date = now()::date),
    'in_transit', count(*) FILTER (WHERE status IN ('picked_up','in_transit','out_for_delivery','bagged','reached_hub','dispatched','at_hub')),
    'delivered', count(*) FILTER (WHERE status = 'delivered'),
    'pending', count(*) FILTER (WHERE status IN ('pending','booked','awaiting_payment')),
    'revenue', COALESCE(sum(price) FILTER (WHERE status <> 'cancelled'),0),
    'by_status', COALESCE((SELECT jsonb_object_agg(x.status, x.n) FROM (SELECT s2.status, count(*) n FROM public.shipments s2 WHERE staff OR s2.user_id = auth.uid() GROUP BY s2.status) x), '{}'::jsonb),
    'last7', (SELECT jsonb_agg(jsonb_build_object('d', g::date, 'n', (SELECT count(*) FROM public.shipments s3 WHERE (staff OR s3.user_id = auth.uid()) AND s3.created_at::date = g::date)) ORDER BY g) FROM generate_series(current_date - 6, current_date, interval '1 day') g),
    'pincodes', (SELECT count(*) FROM public.pincode_allocations WHERE holder_user_id = auth.uid() AND status = 'active'),
    'delegated', (SELECT count(*) FROM public.pincode_allocations WHERE status = 'active' AND (adm OR assigned_by = auth.uid()::text)),
    'team', CASE WHEN staff THEN (SELECT count(DISTINCT user_id) FROM public.user_roles) ELSE 0 END,
    'applications', CASE WHEN adm THEN (SELECT count(*) FROM public.point_applications WHERE status = 'pending') ELSE 0 END,
    'users', CASE WHEN adm THEN (SELECT count(*) FROM public.profiles) ELSE 0 END)
  FROM public.shipments WHERE staff OR user_id = auth.uid());
END $$;

CREATE FUNCTION public.deposit_instructions() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object('upi_id', pay_upi_id, 'upi_name', pay_upi_name, 'bank_name', pay_bank_name,
    'account_name', pay_account_name, 'account_no', pay_account_no, 'ifsc', pay_ifsc, 'instructions', pay_instructions)
  FROM public.app_settings WHERE id = true AND auth.uid() IS NOT NULL $$;

CREATE FUNCTION public.find_user_by_phone(_phone text) RETURNS TABLE(user_id uuid, full_name text, phone text, roles text[]) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT p.id, p.full_name, p.phone,
    COALESCE((SELECT array_agg(r.role::text) FROM public.user_roles r WHERE r.user_id = p.id), '{}'::text[])
  FROM public.profiles p WHERE right(regexp_replace(COALESCE(p.phone,''),'\D','','g'),10) = right(regexp_replace(_phone,'\D','','g'),10);
END $$;

CREATE FUNCTION public.generate_seal_codes(_count integer, _kind text) RETURNS TABLE(code text, batch_id text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b text := 'B' || to_char(now(),'YYMMDDHH24MISS');
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _count < 1 OR _count > 500 THEN RAISE EXCEPTION 'Count must be 1-500'; END IF;
  RETURN QUERY INSERT INTO public.seal_codes AS sc (code, batch_id, kind, created_by)
    SELECT upper(left(COALESCE(_kind,'S'),1)) || upper(substr(md5(random()::text || g::text),1,9)), b, COALESCE(_kind,'seal'), auth.uid()
    FROM generate_series(1,_count) g
    RETURNING sc.code, sc.batch_id;
END $$;

CREATE FUNCTION public.grant_staff_role(_user_id uuid, _role public.app_role, _state text DEFAULT NULL::text, _point_id uuid DEFAULT NULL::uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role) ON CONFLICT DO NOTHING;
  IF _state IS NOT NULL OR _point_id IS NOT NULL THEN
    INSERT INTO public.staff_scopes(user_id, role, state, point_id, created_by) VALUES (_user_id, _role, _state, _point_id, auth.uid());
  END IF;
  INSERT INTO public.audit_logs(action, actor, entity, entity_id, meta) VALUES ('grant_role', auth.uid()::text, 'user', _user_id::text, jsonb_build_object('role',_role,'state',_state));
END $$;

CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, contact_email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE FUNCTION public.hub_booking_commission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE pct numeric;
BEGIN
  IF NEW.price > 0 AND public.has_role(NEW.user_id,'point') THEN
    SELECT hub_commission_percent INTO pct FROM public.app_settings WHERE id = true;
    IF COALESCE(pct,0) > 0 THEN
      INSERT INTO public.point_commissions(point_user_id, shipment_id, amount, rate, status)
      VALUES (NEW.user_id, NEW.id, round(NEW.price * pct / 100, 2), pct, 'pending');
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.hub_booking_debit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE bal numeric;
BEGIN
  IF NEW.price > 0 AND (NEW.payment_method = 'wallet' OR (public.has_role(NEW.user_id,'point') AND COALESCE(NEW.payment_method,'') NOT IN ('cash','cod','cash_on_pickup'))) THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));
    IF NEW.payment_method = 'wallet' THEN
      SELECT COALESCE(sum(amount),0) INTO bal FROM public.wallet_transactions WHERE user_id = NEW.user_id;
      IF bal < NEW.price THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
    END IF;
    INSERT INTO public.wallet_transactions(user_id, amount, kind, note, ref) VALUES (NEW.user_id, -NEW.price, 'booking', 'Booking ' || NEW.tracking_number, NEW.id::text);
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.import_pincodes(_rows jsonb) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $_$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.pincodes(pincode, city, state, area, zone, tier, hub_name, active)
  SELECT r->>'pincode', COALESCE(r->>'city',''), COALESCE(r->>'state',''), r->>'area', r->>'zone', r->>'tier', r->>'hub_name', COALESCE((r->>'active')::boolean, true)
  FROM jsonb_array_elements(_rows) r WHERE COALESCE(r->>'pincode','') ~ '^\d{6}$'
  ON CONFLICT (pincode) DO UPDATE SET city = EXCLUDED.city, state = EXCLUDED.state, area = COALESCE(EXCLUDED.area, pincodes.area), hub_name = COALESCE(EXCLUDED.hub_name, pincodes.hub_name);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $_$;

CREATE FUNCTION public.manage_staff_assignment(_user uuid, _role public.app_role, _enabled boolean, _state text DEFAULT NULL::text, _area text DEFAULT NULL::text, _pin text DEFAULT NULL::text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF _role = 'admin' THEN RAISE EXCEPTION 'Admin ownership cannot be changed here'; END IF;
  IF _enabled THEN
    IF _state IS NULL OR length(trim(_state)) < 2 THEN RAISE EXCEPTION 'Select state'; END IF;
    INSERT INTO public.user_roles(user_id, role) VALUES (_user, _role) ON CONFLICT DO NOTHING;
    UPDATE public.staff_scopes SET revoked_at = now() WHERE user_id = _user AND role = _role AND revoked_at IS NULL;
    INSERT INTO public.staff_scopes(user_id, role, state, created_by) VALUES (_user, _role, _state, auth.uid());
    IF _pin IS NOT NULL AND _pin <> '' THEN
      IF EXISTS (SELECT 1 FROM public.pincode_allocations WHERE pincode = _pin AND holder_role = _role AND status = 'active' AND holder_user_id <> _user) THEN
        RAISE EXCEPTION 'This PIN already has someone in this position'; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.pincode_allocations WHERE pincode = _pin AND holder_role = _role AND status = 'active' AND holder_user_id = _user) THEN
        INSERT INTO public.pincode_allocations(pincode, holder_user_id, holder_role, area, assigned_by, note, status)
        VALUES (_pin, _user, _role, nullif(trim(_area),''), auth.uid()::text, _state, 'active');
      END IF;
    END IF;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user AND role = _role;
    UPDATE public.staff_scopes SET revoked_at = now() WHERE user_id = _user AND role = _role AND revoked_at IS NULL;
    UPDATE public.pincode_allocations SET status = 'ended', effective_to = current_date::text WHERE holder_user_id = _user AND holder_role = _role AND status = 'active';
  END IF;
  INSERT INTO public.audit_logs(action, actor, entity, entity_id, meta) VALUES ('staff_assignment', auth.uid()::text, 'user', _user::text, jsonb_build_object('role',_role,'enabled',_enabled,'state',_state,'pin',_pin));
END $$;

CREATE FUNCTION public.otp_channel() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT CASE WHEN enabled AND COALESCE(api_key,'') <> '' THEN 'whatsapp' END FROM public.whatsapp_settings LIMIT 1), 'test') $$;

CREATE FUNCTION public.public_company() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT jsonb_build_object('company_name', company_name, 'tagline', tagline, 'description', description,
    'logo_url', logo_url, 'icon_url', icon_url, 'hero_image_url', hero_image_url, 'og_image_url', og_image_url,
    'support_email', support_email, 'support_phone', support_phone, 'support_whatsapp', support_whatsapp,
    'address', address, 'city', city, 'state', state, 'pincode', pincode, 'business_hours', business_hours,
    'footer_text', footer_text, 'facebook_url', facebook_url, 'instagram_url', instagram_url, 'linkedin_url', linkedin_url,
    'x_url', x_url, 'youtube_url', youtube_url, 'site_live', site_live, 'maintenance_message', maintenance_message,
    'meta_title', meta_title, 'meta_description', meta_description, 'cash_on_pickup', cash_on_pickup)
    FROM public.app_settings WHERE id LIMIT 1), '{}'::jsonb) $$;

CREATE FUNCTION public.public_offers() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(jsonb_agg(o ORDER BY o->>'created_at' DESC), '[]'::jsonb) FROM (
    SELECT jsonb_build_object('code', code, 'description', description, 'discount_type', discount_type, 'discount_value', discount_value,
      'max_discount', max_discount, 'min_order', min_order, 'expires_at', expires_at, 'created_at', created_at) o
    FROM public.coupons
    WHERE active AND show_on_site AND starts_at <= now() AND (expires_at IS NULL OR expires_at > now()) AND (max_uses IS NULL OR used_count < max_uses)
    ORDER BY created_at DESC LIMIT 12) t $$;

CREATE FUNCTION public.receive_manifest(_manifest_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m public.manifests;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.manifests SET status = 'received', received_at = now(), received_by = auth.uid()::text WHERE id = _manifest_id RETURNING * INTO m;
  UPDATE public.bags SET status = 'received' WHERE manifest_id = _manifest_id;
  INSERT INTO public.tracking_events(shipment_id, piece_id, status, location, note)
  SELECT p.shipment_id, p.id, 'reached_hub', m.to_location, 'Manifest ' || m.manifest_code || ' received'
  FROM public.bags b JOIN public.bag_items i ON i.bag_id = b.id JOIN public.shipment_pieces p ON p.id = i.piece_id WHERE b.manifest_id = _manifest_id;
END $$;

CREATE FUNCTION public.release_pincode(_allocation_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.pincode_allocations SET status = 'ended', effective_to = current_date::text WHERE id = _allocation_id;
END $$;

CREATE FUNCTION public.reward_stats() RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN public.has_role(auth.uid(),'admin') THEN json_build_object(
    'sent', (SELECT count(*) FROM public.first_order_rewards),
    'claimed', (SELECT count(*) FROM public.coupons WHERE is_private_reward AND used_count > 0)) ELSE NULL END $$;

CREATE FUNCTION public.route_connected(_from text, _to text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.hub_routes WHERE active)
      OR EXISTS (SELECT 1 FROM public.hub_routes WHERE active AND ((lower(from_location)=lower(_from) AND lower(to_location)=lower(_to)) OR (lower(from_location)=lower(_to) AND lower(to_location)=lower(_from)))) $$;

CREATE FUNCTION public.scan_bag_code(_code text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b public.bags;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO b FROM public.bags WHERE upper(bag_code) = upper(trim(_code)) OR upper(seal_no) = upper(trim(_code)) OR upper(plastic_bag_code) = upper(trim(_code)) LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(b) || jsonb_build_object('items', COALESCE((SELECT jsonb_agg(p.piece_code) FROM public.bag_items i JOIN public.shipment_pieces p ON p.id = i.piece_id WHERE i.bag_id = b.id), '[]'::jsonb));
END $$;

CREATE FUNCTION public.scan_piece(_code text, _status text, _location text DEFAULT NULL::text, _note text DEFAULT NULL::text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.shipment_pieces; s public.shipments;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO p FROM public.shipment_pieces WHERE upper(piece_code) = upper(trim(_code));
  IF FOUND THEN SELECT * INTO s FROM public.shipments WHERE id = p.shipment_id;
  ELSE SELECT * INTO s FROM public.shipments WHERE upper(tracking_number) = upper(trim(_code)); END IF;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Parcel % not found', _code; END IF;
  INSERT INTO public.tracking_events(shipment_id, piece_id, status, location, note) VALUES (s.id, p.id, _status, _location, _note);
  UPDATE public.shipments SET status = _status, updated_at = now() WHERE id = s.id;
  INSERT INTO public.audit_logs(action, actor, entity, entity_id, meta) VALUES ('parcel_scan', auth.uid()::text, 'shipment', s.id::text, jsonb_build_object('status',_status,'code',_code));
  RETURN jsonb_build_object('tracking_number', s.tracking_number, 'piece_code', p.piece_code, 'status', _status);
END $$;

CREATE FUNCTION public.seal_bag(_bag_id uuid, _seal text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.seal_codes WHERE code = _seal AND used_bag_id IS NOT NULL) THEN RAISE EXCEPTION 'Seal already used'; END IF;
  UPDATE public.seal_codes SET used_bag_id = _bag_id WHERE code = _seal;
  UPDATE public.bags SET seal_no = _seal, sealed_at = now(), status = 'sealed' WHERE id = _bag_id;
END $$;

CREATE FUNCTION public.set_plastic_bag(_bag_id uuid, _code text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.bags SET plastic_bag_code = _code WHERE id = _bag_id;
END $$;

CREATE FUNCTION public.settle_commissions(_ids uuid[]) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.wallet_transactions(user_id, amount, kind, note, ref)
  SELECT point_user_id, amount, 'commission', 'Commission settled', id::text FROM public.point_commissions WHERE id = ANY(_ids) AND status = 'pending';
  UPDATE public.point_commissions SET status = 'settled', settled_at = now(), settled_by = auth.uid()::text WHERE id = ANY(_ids) AND status = 'pending';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

CREATE FUNCTION public.staff_directory() RETURNS TABLE(user_id uuid, full_name text, phone text, roles text[], states text[]) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT r.user_id, p.full_name, p.phone, array_agg(DISTINCT r.role::text),
    COALESCE((SELECT array_agg(DISTINCT s.state) FROM public.staff_scopes s WHERE s.user_id = r.user_id AND s.revoked_at IS NULL AND s.state IS NOT NULL), '{}'::text[])
  FROM public.user_roles r LEFT JOIN public.profiles p ON p.id = r.user_id GROUP BY r.user_id, p.full_name, p.phone;
END $$;

CREATE FUNCTION public.touch_last_seen() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid() $$;

CREATE FUNCTION public.track_quote(_ref text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object('reference', reference, 'status', status, 'created_at', created_at, 'updated_at', updated_at,
    'from_country', sender->>'country', 'from_city', sender->>'city', 'to_country', receiver->>'country', 'to_city', receiver->>'city', 'weight_kg', weight_kg,
    'service_name', service_name, 'booked_at', booked_at, 'carrier_awb', carrier_awb, 'history', history)
  FROM public.international_quote_requests WHERE upper(reference) = upper(trim(_ref)) LIMIT 1 $$;

CREATE FUNCTION public.track_shipment(_tracking text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'tracking_number', s.tracking_number, 'status', s.status, 'service', s.service, 'created_at', s.created_at,
    'updated_at', s.updated_at, 'from_city', s.sender_city, 'to_city', s.receiver_city, 'pieces_count', s.pieces_count,
    'weight_kg', s.weight_kg,
    'pieces', COALESCE((SELECT jsonb_agg(jsonb_build_object('piece_code', p.piece_code, 'seq_no', p.seq_no) ORDER BY p.seq_no) FROM public.shipment_pieces p WHERE p.shipment_id = s.id), '[]'::jsonb),
    'events', COALESCE((SELECT jsonb_agg(jsonb_build_object('status', e.status, 'location', e.location, 'note', e.note, 'created_at', e.created_at) ORDER BY e.created_at DESC) FROM public.tracking_events e WHERE e.shipment_id = s.id), '[]'::jsonb))
  FROM public.shipments s
  WHERE upper(s.tracking_number) = upper(trim(_tracking))
     OR s.id IN (SELECT shipment_id FROM public.shipment_pieces WHERE upper(piece_code) = upper(trim(_tracking)))
  LIMIT 1 $$;

CREATE FUNCTION public.transfer_pincode(_allocation_id uuid, _new_holder uuid, _note text DEFAULT NULL::text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.pincode_allocations; _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO a FROM public.pincode_allocations WHERE id = _allocation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Allocation not found'; END IF;
  UPDATE public.pincode_allocations SET status = 'transferred', effective_to = current_date::text WHERE id = _allocation_id;
  INSERT INTO public.pincode_allocations(pincode, holder_user_id, holder_role, area, note, assigned_by, status)
  VALUES (a.pincode, _new_holder, a.holder_role, a.area, _note, auth.uid()::text, 'active') RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE FUNCTION public.update_quote_status(_id uuid, _status text, _note text DEFAULT NULL::text, _price numeric DEFAULT NULL::numeric, _awb text DEFAULT NULL::text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('pending','reviewing','quoted','booking_requested','booked','picked_up','in_transit','customs','out_for_delivery','delivered','cancelled') THEN RAISE EXCEPTION 'Unknown status'; END IF;
  UPDATE public.international_quote_requests SET status = _status, updated_at = now(),
    quoted_price = COALESCE(_price, quoted_price), carrier_awb = COALESCE(nullif(trim(_awb),''), carrier_awb),
    history = history || jsonb_build_array(jsonb_build_object('status',_status,'note',nullif(trim(COALESCE(_note,'')),''),'at',now()))
  WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;
  INSERT INTO public.audit_logs(action, actor, entity, entity_id, meta) VALUES ('quote_status', auth.uid()::text, 'international_quote', _id::text, jsonb_build_object('status',_status));
END $$;

CREATE FUNCTION public.update_return_status(_return_id uuid, _status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.returns SET status = _status, updated_at = now() WHERE id = _return_id;
END $$;

CREATE FUNCTION public.wallet_balance(_user uuid DEFAULT NULL::uuid) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE u uuid := COALESCE(_user, auth.uid());
BEGIN
  IF u <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN COALESCE((SELECT sum(amount) FROM public.wallet_transactions WHERE user_id = u), 0);
END $$;

CREATE FUNCTION public.wallet_topup(_amount numeric, _ref text DEFAULT NULL::text) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Top-ups are credited after payment verification'; END IF;
  INSERT INTO public.wallet_transactions(user_id, amount, kind, note, ref) VALUES (auth.uid(), _amount, 'topup', 'Wallet top-up', _ref);
  RETURN public.wallet_balance(auth.uid());
END $$;

CREATE FUNCTION public.whatsapp_ready() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT enabled AND COALESCE(api_key,'') <> '' AND base_url <> '' FROM public.whatsapp_settings LIMIT 1), false) $$;

CREATE FUNCTION public.withdrawal_paid_debit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    INSERT INTO public.wallet_transactions(user_id, amount, kind, note, ref) VALUES (NEW.user_id, -NEW.amount, 'withdrawal', 'Payout ' || NEW.payout_method, NEW.id::text);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER shipment_hub_debit AFTER INSERT ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.hub_booking_debit();
CREATE TRIGGER trg_hub_booking_commission AFTER INSERT ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.hub_booking_commission();
CREATE TRIGGER wallet_deposit_review BEFORE UPDATE ON public.wallet_deposits FOR EACH ROW EXECUTE FUNCTION public.credit_approved_deposit();
CREATE TRIGGER wallet_withdrawal_paid BEFORE UPDATE ON public.wallet_withdrawals FOR EACH ROW EXECUTE FUNCTION public.withdrawal_paid_debit();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['app_settings','audit_logs','bag_items','bags','coupon_redemptions','coupons','courier_provider_settings','email_logs','email_templates','gateway_configs','health_checks','integration_settings','international_quote_requests','label_prints','login_otps','manifests','notifications','parcel_presets','payments','phone_otps','pincode_allocations','pincodes','point_applications','point_commissions','profiles','returns','seal_codes','service_rates','shipment_pieces','shipments','smtp_settings','staff_scopes','state_rates','tracking_events','user_roles','wallet_deposits','wallet_transactions','wallet_withdrawals','whatsapp_settings','whatsapp_templates'] LOOP
    EXECUTE format('CREATE POLICY "admin full access" ON public.%I TO authenticated USING (public.has_role(auth.uid(), ''admin''::public.app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::public.app_role))', t);
  END LOOP;
END $$;
CREATE POLICY "active coupons read" ON public.coupons FOR SELECT TO authenticated USING (active);
CREATE POLICY "apply as partner" ON public.point_applications FOR INSERT TO authenticated, anon WITH CHECK (status = 'pending');
CREATE POLICY "log actions" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor = auth.uid()::text);
CREATE POLICY "managers write routes" ON public.hub_routes TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'network') OR public.has_role(auth.uid(),'area_manager') OR public.has_role(auth.uid(),'state_manager')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'network') OR public.has_role(auth.uid(),'area_manager') OR public.has_role(auth.uid(),'state_manager'));
CREATE POLICY "own allocations" ON public.pincode_allocations FOR SELECT TO authenticated USING (holder_user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own applications" ON public.point_applications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own commissions" ON public.point_commissions FOR SELECT TO authenticated USING (point_user_id = auth.uid());
CREATE POLICY "own coupon redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own coupon redemptions insert" ON public.coupon_redemptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own deposits" ON public.wallet_deposits FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own deposits insert" ON public.wallet_deposits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "own events insert" ON public.tracking_events FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = tracking_events.shipment_id AND s.user_id = auth.uid()));
CREATE POLICY "own events read" ON public.tracking_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = tracking_events.shipment_id AND s.user_id = auth.uid()));
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own payments" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own payments insert" ON public.payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own pieces insert" ON public.shipment_pieces FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_pieces.shipment_id AND s.user_id = auth.uid()));
CREATE POLICY "own pieces read" ON public.shipment_pieces FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_pieces.shipment_id AND s.user_id = auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own quotes" ON public.international_quote_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own quotes insert" ON public.international_quote_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own returns read" ON public.returns FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = returns.shipment_id AND s.user_id = auth.uid()));
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own scopes read" ON public.staff_scopes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own shipments insert" ON public.shipments FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid() OR public.is_staff(auth.uid())) AND policy_accepted_at IS NOT NULL);
CREATE POLICY "own shipments read" ON public.shipments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own tickets insert" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own tickets read" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own wallet tx" ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own withdrawals" ON public.wallet_withdrawals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own withdrawals insert" ON public.wallet_withdrawals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "public read" ON public.parcel_presets FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "public read" ON public.pincodes FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "public read" ON public.service_rates FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "public read" ON public.state_rates FOR SELECT TO authenticated, anon USING (true);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['bag_items','bags','label_prints','manifests','point_commissions','returns','seal_codes','shipment_pieces','tracking_events'] LOOP
    EXECUTE format('CREATE POLICY "staff manage" ON public.%I TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t);
  END LOOP;
END $$;
CREATE POLICY "staff read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff read routes" ON public.hub_routes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff shipments update" ON public.shipments FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "staff update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff write pincodes" ON public.pincodes FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

INSERT INTO public.profiles (id, contact_email) SELECT id, email FROM auth.users ON CONFLICT DO NOTHING;
INSERT INTO public.app_settings (id, company_name, tagline, hub_commission_percent) VALUES (true, 'GetXpress', 'Fast, safe parcel delivery across India and worldwide', 10);
INSERT INTO public.integration_settings (id) VALUES (true);
INSERT INTO public.whatsapp_settings (id) VALUES (true);
INSERT INTO public.smtp_settings (id, enabled, host, port, provider, secure, from_name) VALUES (true, true, 'smtp.gmail.com', 465, 'gmail', 'ssl', 'GetXpress');
INSERT INTO public.service_rates (service, base, per_kg) VALUES ('standard', 49, 20), ('express', 79, 30), ('same_day', 129, 45);
INSERT INTO public.gateway_configs (category, provider, config, enabled, live_mode) VALUES ('international', 'shipglobal', '{"base_url":"https://shipglobal-rate-spark.lovable.app"}'::jsonb, true, true);
INSERT INTO public.coupons (id, code, active, discount_type, discount_value, max_discount, max_uses, min_order, per_user_limit, show_on_site, is_private_reward)
VALUES ('ec64b54e-c17f-4076-9783-ed2d9b1f25b4', 'NEW', true, 'percent', 100, 50, 100, 60, 1, true, false);