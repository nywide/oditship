-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE public.app_role AS ENUM (
  'superviseur',
  'administrateur',
  'vendeur',
  'agent',
  'ramassoire',
  'magasinier',
  'support',
  'suivi',
  'comptable',
  'livreur',
  'commercial',
  'gestion_retour'
);

-- =====================================================
-- HELPER: updated_at trigger function
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- PROFILES
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendeur',
  full_name TEXT,
  phone TEXT,
  cin TEXT,
  company_name TEXT,
  affiliation_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  agent_of UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  api_enabled BOOLEAN NOT NULL DEFAULT false,
  api_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- USER ROLES (separate table - security best practice)
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to safely check roles inside RLS without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =====================================================
-- AUTO-CREATE PROFILE + ROLE ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _username TEXT;
  _role_text TEXT;
  _role_enum public.app_role;
BEGIN
  _username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  _role_text := COALESCE(NEW.raw_user_meta_data->>'role', 'vendeur');
  
  BEGIN
    _role_enum := _role_text::public.app_role;
  EXCEPTION WHEN others THEN
    _role_enum := 'vendeur'::public.app_role;
  END;

  INSERT INTO public.profiles (
    id, username, role, full_name, phone, cin, affiliation_code, is_active
  ) VALUES (
    NEW.id,
    _username,
    _role_text,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cin',
    NEW.raw_user_meta_data->>'affiliation_code',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role_enum)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PROFILES RLS
-- =====================================================
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Vendeurs can view their agents"
ON public.profiles FOR SELECT TO authenticated
USING (agent_of = auth.uid());

CREATE POLICY "Administrators can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid());

CREATE POLICY "Administrators can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'));

CREATE POLICY "Administrators can insert profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrateur'));

CREATE POLICY "Vendeurs can insert agent profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (agent_of = auth.uid());

-- =====================================================
-- USER_ROLES RLS
-- =====================================================
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Administrators can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'));

CREATE POLICY "Administrators manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'))
WITH CHECK (public.has_role(auth.uid(), 'administrateur'));

-- =====================================================
-- CITIES
-- =====================================================
CREATE TABLE public.cities (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cities readable by everyone"
ON public.cities FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Administrators manage cities"
ON public.cities FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'))
WITH CHECK (public.has_role(auth.uid(), 'administrateur'));

-- =====================================================
-- HUBS
-- =====================================================
CREATE TABLE public.hubs (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER hubs_updated_at
BEFORE UPDATE ON public.hubs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Hubs readable by authenticated"
ON public.hubs FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Administrators manage hubs"
ON public.hubs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'))
WITH CHECK (public.has_role(auth.uid(), 'administrateur'));

-- =====================================================
-- HUB_CITIES (M2M)
-- =====================================================
CREATE TABLE public.hub_cities (
  id SERIAL PRIMARY KEY,
  hub_id INTEGER NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  city_name TEXT NOT NULL REFERENCES public.cities(name) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE (hub_id, city_name)
);

CREATE INDEX idx_hub_cities_city ON public.hub_cities(city_name);
CREATE INDEX idx_hub_cities_hub ON public.hub_cities(hub_id);

ALTER TABLE public.hub_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hub-cities readable by authenticated"
ON public.hub_cities FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Administrators manage hub-cities"
ON public.hub_cities FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'))
WITH CHECK (public.has_role(auth.uid(), 'administrateur'));

-- =====================================================
-- HUB_LIVREUR (each hub assigned to exactly one livreur; livreur may have many hubs)
-- =====================================================
CREATE TABLE public.hub_livreur (
  id SERIAL PRIMARY KEY,
  hub_id INTEGER UNIQUE NOT NULL REFERENCES public.hubs(id) ON DELETE CASCADE,
  livreur_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_livreur_livreur ON public.hub_livreur(livreur_id);

ALTER TABLE public.hub_livreur ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hub-livreur readable by authenticated"
ON public.hub_livreur FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Administrators manage hub-livreur"
ON public.hub_livreur FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'))
WITH CHECK (public.has_role(auth.uid(), 'administrateur'));

-- =====================================================
-- PRICING_RULES
-- =====================================================
CREATE TABLE public.pricing_rules (
  id SERIAL PRIMARY KEY,
  city TEXT NOT NULL REFERENCES public.cities(name) ON UPDATE CASCADE ON DELETE CASCADE,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  refusal_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  annulation_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  vendeur_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (city, vendeur_id)
);

CREATE UNIQUE INDEX uniq_pricing_rules_global_city
ON public.pricing_rules(city) WHERE vendeur_id IS NULL;

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER pricing_rules_updated_at
BEFORE UPDATE ON public.pricing_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Pricing rules readable by everyone"
ON public.pricing_rules FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Administrators manage pricing rules"
ON public.pricing_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'))
WITH CHECK (public.has_role(auth.uid(), 'administrateur'));

-- Auto-create global pricing rule when a city is added
CREATE OR REPLACE FUNCTION public.handle_new_city()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pricing_rules (city, delivery_fee, refusal_fee, annulation_fee, vendeur_id)
  VALUES (NEW.name, 0, 0, 0, NULL)
  ON CONFLICT (city) WHERE vendeur_id IS NULL DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_city_created
AFTER INSERT ON public.cities
FOR EACH ROW EXECUTE FUNCTION public.handle_new_city();

-- =====================================================
-- ORDERS
-- =====================================================
CREATE TABLE public.orders (
  id SERIAL PRIMARY KEY,
  tracking_number TEXT UNIQUE,
  external_tracking_number TEXT,
  barcode TEXT,
  qr_code TEXT,
  vendeur_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_city TEXT NOT NULL,
  product_name TEXT NOT NULL,
  order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  open_package BOOLEAN NOT NULL DEFAULT false,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'Crée',
  postponed_date DATE,
  scheduled_date DATE,
  return_note TEXT,
  status_note TEXT,
  assigned_livreur_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hub_id INTEGER REFERENCES public.hubs(id) ON DELETE SET NULL,
  api_sync_status TEXT,
  api_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_vendeur ON public.orders(vendeur_id);
CREATE INDEX idx_orders_agent ON public.orders(agent_id);
CREATE INDEX idx_orders_livreur ON public.orders(assigned_livreur_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_city ON public.orders(customer_city);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Vendeurs see their own orders"
ON public.orders FOR SELECT TO authenticated
USING (vendeur_id = auth.uid());

CREATE POLICY "Agents see their vendeur's orders"
ON public.orders FOR SELECT TO authenticated
USING (vendeur_id IN (SELECT agent_of FROM public.profiles WHERE id = auth.uid() AND agent_of IS NOT NULL));

CREATE POLICY "Livreurs see their assigned orders"
ON public.orders FOR SELECT TO authenticated
USING (assigned_livreur_id = auth.uid());

CREATE POLICY "Ramassoires see Confirmé and Pickup"
ON public.orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'ramassoire') AND status IN ('Confirmé', 'Pickup'));

CREATE POLICY "Administrators see all orders"
ON public.orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'));

CREATE POLICY "Superviseur sees all orders"
ON public.orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'superviseur'));

CREATE POLICY "Support sees all orders"
ON public.orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'support'));

CREATE POLICY "Suivi sees all orders"
ON public.orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'suivi'));

CREATE POLICY "Vendeurs insert their own orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (vendeur_id = auth.uid());

CREATE POLICY "Agents insert orders for their vendeur"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (vendeur_id = (SELECT agent_of FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Vendeurs update their own orders"
ON public.orders FOR UPDATE TO authenticated
USING (vendeur_id = auth.uid());

CREATE POLICY "Agents update their vendeur's orders"
ON public.orders FOR UPDATE TO authenticated
USING (vendeur_id = (SELECT agent_of FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Administrators update orders"
ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'));

CREATE POLICY "Vendeurs delete their Crée orders"
ON public.orders FOR DELETE TO authenticated
USING (vendeur_id = auth.uid() AND status = 'Crée');

CREATE POLICY "Administrators delete orders"
ON public.orders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'));

-- =====================================================
-- ORDER_STATUS_HISTORY
-- =====================================================
CREATE TABLE public.order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_status_history_order ON public.order_status_history(order_id);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "History visible if order visible"
ON public.order_status_history FOR SELECT TO authenticated
USING (
  order_id IN (SELECT id FROM public.orders)
);

-- Auto-log status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_status_history_trigger
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- =====================================================
-- INVOICES
-- =====================================================
CREATE TABLE public.invoices (
  id SERIAL PRIMARY KEY,
  vendeur_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_delivered_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_refused_fees NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_annule_fees NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fees NUMERIC(12,2) NOT NULL DEFAULT 0,
  packaging_fees NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendeurs see own invoices"
ON public.invoices FOR SELECT TO authenticated
USING (vendeur_id = auth.uid());

CREATE POLICY "Administrators see all invoices"
ON public.invoices FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'));

CREATE POLICY "Comptables see all invoices"
ON public.invoices FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'comptable'));

CREATE POLICY "Administrators manage invoices"
ON public.invoices FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'))
WITH CHECK (public.has_role(auth.uid(), 'administrateur'));

CREATE POLICY "Comptables manage invoices"
ON public.invoices FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'comptable'))
WITH CHECK (public.has_role(auth.uid(), 'comptable'));

-- =====================================================
-- INVOICE_ITEMS
-- =====================================================
CREATE TABLE public.invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES public.orders(id) ON DELETE SET NULL,
  order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  fee_type TEXT,
  fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoice items follow invoice access"
ON public.invoice_items FOR SELECT TO authenticated
USING (invoice_id IN (SELECT id FROM public.invoices));

CREATE POLICY "Administrators manage invoice items"
ON public.invoice_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'))
WITH CHECK (public.has_role(auth.uid(), 'administrateur'));