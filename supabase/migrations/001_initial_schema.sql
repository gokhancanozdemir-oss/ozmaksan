-- ÖZMAKSAN WMS/MES — İlk şema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  default_unit TEXT NOT NULL CHECK (default_unit IN ('kg', 'm', 'adet')),
  stock_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE consumption_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'm', 'adet')),
  unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_qr_code ON products(qr_code);
CREATE INDEX idx_consumption_project ON consumption_records(project_id);
CREATE INDEX idx_consumption_product ON consumption_records(product_id);
CREATE INDEX idx_consumption_created ON consumption_records(created_at DESC);

CREATE OR REPLACE FUNCTION public.record_consumption(
  p_qr_code TEXT,
  p_project_id UUID,
  p_quantity NUMERIC,
  p_unit TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product products%ROWTYPE;
  v_record consumption_records%ROWTYPE;
  v_remaining NUMERIC(12, 3);
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Miktar sıfırdan büyük olmalı';
  END IF;

  IF p_unit NOT IN ('kg', 'm', 'adet') THEN
    RAISE EXCEPTION 'Geçersiz birim: %', p_unit;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND is_active = true) THEN
    RAISE EXCEPTION 'Proje bulunamadı veya pasif';
  END IF;

  SELECT * INTO v_product
  FROM products
  WHERE qr_code = p_qr_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ürün bulunamadı: %', p_qr_code;
  END IF;

  IF v_product.stock_quantity < p_quantity THEN
    RAISE EXCEPTION 'Yetersiz stok. Mevcut: % %', v_product.stock_quantity, v_product.default_unit;
  END IF;

  INSERT INTO consumption_records (product_id, project_id, quantity, unit, unit_cost)
  VALUES (v_product.id, p_project_id, p_quantity, p_unit, v_product.unit_cost)
  RETURNING * INTO v_record;

  UPDATE products
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = v_product.id
  RETURNING stock_quantity INTO v_remaining;

  RETURN json_build_object(
    'id', v_record.id,
    'total_cost', v_record.total_cost,
    'product_name', v_product.name,
    'remaining_stock', v_remaining
  );
END;
$$;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_active"
  ON projects FOR SELECT
  USING (is_active = true);

CREATE POLICY "products_select_all"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "consumption_select_all"
  ON consumption_records FOR SELECT
  USING (true);

CREATE POLICY "consumption_insert_all"
  ON consumption_records FOR INSERT
  WITH CHECK (true);

GRANT SELECT ON projects TO anon, authenticated;
GRANT SELECT, UPDATE ON products TO anon, authenticated;
GRANT SELECT, INSERT ON consumption_records TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_consumption TO anon, authenticated;

INSERT INTO projects (name, description) VALUES
  ('STEAMAx Boiler — Buhar Kazanı', 'Yüksek basınçlı buhar kazanı üretimi'),
  ('TEmPoIL Boiler — Kızgın Yağ Kazanı', 'Kızgın yağ kazanı üretimi'),
  ('SCOTCHmAXBoiler — Sıcak Su Kazanı', 'Sıvı/gaz yakıtlı sıcak su kazanı'),
  ('Ekonomizer & Rekuperatör', 'Enerji geri kazanım ekipmanları'),
  ('Akümülasyon Tankı', 'Depolama tankları ve basınçlı kaplar'),
  ('Mercedes Benz Tesisi', 'Mercedes Benz referans projesi'),
  ('Aygaz Dolum Tesisi', 'Aygaz dolum tesisi projesi'),
  ('Kalyon Stadyum', 'Kalyon Stadyum ısıtma projesi'),
  ('Genel Üretim', 'Genel üretim hattı sarfiyatları');

INSERT INTO products (qr_code, name, unit_cost, default_unit, stock_quantity) VALUES
  ('OZMK-CELIK-001', 'Çelik Levha S235', 45.50, 'kg', 2500.000),
  ('OZMK-KABLO-002', 'Enerji Kablosu 3x2.5', 12.80, 'm', 5000.000),
  ('OZMK-FLANZ-003', 'DN150 Flanş', 320.00, 'adet', 48.000),
  ('OZMK-KAYNAK-004', 'Kaynak Teli ER70S-6', 8.75, 'kg', 180.000),
  ('OZMK-IZOL-005', 'Mineral Yün İzolasyon', 22.40, 'm', 1200.000);
