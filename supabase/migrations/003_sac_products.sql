-- Sac (levha) ürün desteği — mevcut veritabanına ekler

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

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS sac_en_mm NUMERIC,
  ADD COLUMN IF NOT EXISTS sac_boy_mm NUMERIC,
  ADD COLUMN IF NOT EXISTS sac_derinlik_mm NUMERIC;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_product_type_check;
ALTER TABLE public.products ADD CONSTRAINT products_product_type_check
  CHECK (product_type IN ('standard', 'sac'));

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sac_dims_check;
ALTER TABLE public.products ADD CONSTRAINT products_sac_dims_check
  CHECK (
    product_type = 'standard'
    OR (sac_en_mm > 0 AND sac_boy_mm > 0 AND sac_derinlik_mm > 0)
  );

ALTER TABLE public.consumption_records
  ADD COLUMN IF NOT EXISTS sac_used_en_mm NUMERIC,
  ADD COLUMN IF NOT EXISTS sac_used_boy_mm NUMERIC;

DROP FUNCTION IF EXISTS public.record_consumption(TEXT, UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.record_consumption(TEXT, UUID, NUMERIC, TEXT, NUMERIC, NUMERIC);

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

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Kullanıcı profili bulunamadı';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projects WHERE id = p_project_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Proje bulunamadı veya pasif';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE qr_code = p_qr_code FOR UPDATE;

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
    RAISE EXCEPTION 'Yetersiz stok. Mevcut: % kg', v_product.stock_quantity;
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

GRANT EXECUTE ON FUNCTION public.calc_sac_kg TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_consumption TO authenticated;
