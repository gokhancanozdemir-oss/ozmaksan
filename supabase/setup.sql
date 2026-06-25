-- ÖZMAKSAN — Tam kurulum (Supabase SQL Editor'da bir kez çalıştırın)
-- Mevcut tablolar varsa önce temizler, sonra yeniden oluşturur.
-- ÖNEMLİ: Önce tablolar silinir (RLS policy'leri kalkar), sonra fonksiyonlar.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS public.consumption_records CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.record_consumption(TEXT, UUID, NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.record_consumption(TEXT, UUID, NUMERIC, TEXT, NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.calc_sac_kg(NUMERIC, NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_authenticated_user() CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE public.user_role AS ENUM ('admin', 'okutucu');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role public.user_role NOT NULL DEFAULT 'okutucu',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  customer TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'standard' CHECK (product_type IN ('standard', 'sac')),
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  default_unit TEXT NOT NULL CHECK (default_unit IN ('kg', 'm', 'adet')),
  stock_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  sac_en_mm NUMERIC,
  sac_boy_mm NUMERIC,
  sac_derinlik_mm NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_sac_dims_check CHECK (
    product_type = 'standard'
    OR (sac_en_mm > 0 AND sac_boy_mm > 0 AND sac_derinlik_mm > 0)
  )
);

CREATE TABLE public.consumption_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'm', 'adet')),
  unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  sac_used_en_mm NUMERIC,
  sac_used_boy_mm NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_products_qr_code ON public.products(qr_code);
CREATE INDEX idx_consumption_project ON public.consumption_records(project_id);
CREATE INDEX idx_consumption_product ON public.consumption_records(product_id);
CREATE INDEX idx_consumption_user ON public.consumption_records(user_id);
CREATE INDEX idx_consumption_created ON public.consumption_records(created_at DESC);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'okutucu')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.calc_sac_kg(
  en_mm NUMERIC,
  boy_mm NUMERIC,
  derinlik_mm NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (en_mm * boy_mm * derinlik_mm * 7.85) / 1000000.0;
$$;

CREATE OR REPLACE FUNCTION public.record_consumption(
  p_qr_code TEXT,
  p_project_id UUID,
  p_quantity NUMERIC,
  p_unit TEXT,
  p_sac_used_en_mm NUMERIC DEFAULT NULL,
  p_sac_used_boy_mm NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_record public.consumption_records%ROWTYPE;
  v_remaining NUMERIC(12, 3);
  v_qty NUMERIC(12, 3);
  v_unit TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Giriş yapmanız gerekiyor';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Kullanıcı profili bulunamadı';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Proje bulunamadı veya pasif';
  END IF;

  SELECT * INTO v_product
  FROM public.products
  WHERE qr_code = p_qr_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ürün bulunamadı: %', p_qr_code;
  END IF;

  IF v_product.product_type = 'sac' THEN
    IF p_sac_used_en_mm IS NULL OR p_sac_used_boy_mm IS NULL
       OR p_sac_used_en_mm <= 0 OR p_sac_used_boy_mm <= 0 THEN
      RAISE EXCEPTION 'Sac için kullanılan en ve boy (mm) girilmeli';
    END IF;
    IF v_product.sac_derinlik_mm IS NULL OR v_product.sac_derinlik_mm <= 0 THEN
      RAISE EXCEPTION 'Sac ürününde kalınlık tanımlı değil';
    END IF;
    v_qty := public.calc_sac_kg(p_sac_used_en_mm, p_sac_used_boy_mm, v_product.sac_derinlik_mm);
    v_unit := 'kg';
  ELSE
    v_qty := p_quantity;
    v_unit := p_unit;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Miktar sıfırdan büyük olmalı';
    END IF;
    IF v_unit NOT IN ('kg', 'm', 'adet') THEN
      RAISE EXCEPTION 'Geçersiz birim: %', v_unit;
    END IF;
  END IF;

  IF v_product.stock_quantity < v_qty THEN
    RAISE EXCEPTION 'Yetersiz stok. Mevcut: % %', v_product.stock_quantity, v_product.default_unit;
  END IF;

  INSERT INTO public.consumption_records (
    product_id, project_id, quantity, unit, unit_cost, user_id,
    sac_used_en_mm, sac_used_boy_mm
  )
  VALUES (
    v_product.id, p_project_id, v_qty, v_unit, v_product.unit_cost, auth.uid(),
    CASE WHEN v_product.product_type = 'sac' THEN p_sac_used_en_mm ELSE NULL END,
    CASE WHEN v_product.product_type = 'sac' THEN p_sac_used_boy_mm ELSE NULL END
  )
  RETURNING * INTO v_record;

  UPDATE public.products
  SET stock_quantity = stock_quantity - v_qty
  WHERE id = v_product.id
  RETURNING stock_quantity INTO v_remaining;

  RETURN json_build_object(
    'id', v_record.id,
    'total_cost', v_record.total_cost,
    'product_name', v_product.name,
    'remaining_stock', v_remaining,
    'quantity_kg', v_qty
  );
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumption_records ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- projects
CREATE POLICY "projects_select_active"
  ON public.projects FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "projects_admin_insert"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "projects_admin_update"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "projects_admin_delete"
  ON public.projects FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- products
CREATE POLICY "products_select_authenticated"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "products_admin_insert"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "products_admin_update"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "products_admin_delete"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- consumption_records
CREATE POLICY "consumption_admin_select"
  ON public.consumption_records FOR SELECT
  TO authenticated
  USING (public.is_admin());

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.projects TO authenticated;
GRANT SELECT ON public.products TO authenticated;
GRANT SELECT ON public.consumption_records TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT EXECUTE ON FUNCTION public.calc_sac_kg TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_consumption TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;

INSERT INTO public.projects (name, customer, description) VALUES
  ('STEAMAx Boiler — Buhar Kazanı', 'Özmaksan', 'Yüksek basınçlı buhar kazanı üretimi'),
  ('TEmPoIL Boiler — Kızgın Yağ Kazanı', 'Özmaksan', 'Kızgın yağ kazanı üretimi'),
  ('SCOTCHmAXBoiler — Sıcak Su Kazanı', 'Özmaksan', 'Sıvı/gaz yakıtlı sıcak su kazanı'),
  ('Ekonomizer & Rekuperatör', 'Özmaksan', 'Enerji geri kazanım ekipmanları'),
  ('Akümülasyon Tankı', 'Özmaksan', 'Depolama tankları ve basınçlı kaplar'),
  ('Mercedes Benz Tesisi', 'Mercedes Benz', 'Mercedes Benz referans projesi'),
  ('Aygaz Dolum Tesisi', 'Aygaz', 'Aygaz dolum tesisi projesi'),
  ('Kalyon Stadyum', 'Kalyon', 'Kalyon Stadyum ısıtma projesi'),
  ('Genel Üretim', 'Özmaksan', 'Genel üretim hattı sarfiyatları');

INSERT INTO public.products (qr_code, name, unit_cost, default_unit, stock_quantity) VALUES
  ('OZMK-CELIK-001', 'Çelik Levha S235', 45.50, 'kg', 2500.000),
  ('OZMK-KABLO-002', 'Enerji Kablosu 3x2.5', 12.80, 'm', 5000.000),
  ('OZMK-FLANZ-003', 'DN150 Flanş', 320.00, 'adet', 48.000),
  ('OZMK-KAYNAK-004', 'Kaynak Teli ER70S-6', 8.75, 'kg', 180.000),
  ('OZMK-IZOL-005', 'Mineral Yün İzolasyon', 22.40, 'm', 1200.000);
