-- Sarfiyat kalemi bağlantısı + ürün soft delete (is_active)

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.consumption_records
  ADD COLUMN IF NOT EXISTS project_item_id UUID
    REFERENCES public.project_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_consumption_project_item
  ON public.consumption_records(project_item_id);

DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;
CREATE POLICY "products_select_authenticated"
  ON public.products FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_admin());

DROP FUNCTION IF EXISTS public.record_consumption(TEXT, UUID, NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.record_consumption(TEXT, UUID, NUMERIC, TEXT, NUMERIC, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.record_consumption(TEXT, UUID, NUMERIC, TEXT, NUMERIC, NUMERIC, UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.record_consumption(
  p_qr_code TEXT,
  p_project_id UUID,
  p_quantity NUMERIC,
  p_unit TEXT,
  p_sac_used_en_mm NUMERIC DEFAULT NULL,
  p_sac_used_boy_mm NUMERIC DEFAULT NULL,
  p_project_item_id UUID DEFAULT NULL
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
  v_item_count INTEGER;
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

  SELECT COUNT(*)::INTEGER INTO v_item_count
  FROM public.project_items
  WHERE project_id = p_project_id;

  IF v_item_count > 0 AND p_project_item_id IS NULL THEN
    RAISE EXCEPTION 'Bu sipariş için kalem seçimi zorunludur';
  END IF;

  IF p_project_item_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.project_items
      WHERE id = p_project_item_id AND project_id = p_project_id
    ) THEN
      RAISE EXCEPTION 'Seçilen kalem bu projeye ait değil';
    END IF;
  END IF;

  SELECT * INTO v_product
  FROM public.products
  WHERE qr_code = p_qr_code AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ürün bulunamadı veya pasif: %', p_qr_code;
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
    product_id, project_id, project_item_id, quantity, unit, unit_cost, user_id,
    sac_used_en_mm, sac_used_boy_mm
  )
  VALUES (
    v_product.id, p_project_id, p_project_item_id, v_qty, v_unit, v_product.unit_cost, auth.uid(),
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

GRANT EXECUTE ON FUNCTION public.record_consumption TO authenticated;

CREATE OR REPLACE FUNCTION public.add_stock_by_qr(
  p_qr_code   TEXT,
  p_quantity  NUMERIC,
  p_unit      TEXT,
  p_notes     TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product      public.products%ROWTYPE;
  v_user_id      UUID;
  v_new_stock    NUMERIC;
BEGIN
  SELECT * INTO v_product
  FROM public.products
  WHERE qr_code = p_qr_code AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ürün bulunamadı veya pasif: %', p_qr_code;
  END IF;

  v_user_id := auth.uid();

  v_new_stock := COALESCE(v_product.stock_quantity, 0) + p_quantity;

  UPDATE public.products
  SET stock_quantity = v_new_stock
  WHERE id = v_product.id;

  INSERT INTO public.stock_additions (product_id, user_id, quantity, unit, notes)
  VALUES (v_product.id, v_user_id, p_quantity, p_unit, p_notes);

  RETURN json_build_object(
    'product_id',    v_product.id,
    'product_name',  v_product.name,
    'added',         p_quantity,
    'unit',          p_unit,
    'new_stock',     v_new_stock
  );
END;
$$;
