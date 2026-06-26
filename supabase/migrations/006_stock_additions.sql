-- Stok giriş kayıtları (stok ekleme audit logu)
CREATE TABLE IF NOT EXISTS public.stock_additions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_additions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stock additions"
  ON public.stock_additions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert stock additions"
  ON public.stock_additions FOR INSERT
  TO authenticated WITH CHECK (true);

-- RPC: QR kodu ile stok ekle
CREATE OR REPLACE FUNCTION public.add_stock_by_qr(
  p_qr_code   TEXT,
  p_quantity  NUMERIC,
  p_unit      TEXT,
  p_notes     TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product      public.products%ROWTYPE;
  v_user_id      UUID;
  v_new_stock    NUMERIC;
BEGIN
  -- Ürünü bul
  SELECT * INTO v_product
  FROM public.products
  WHERE qr_code = p_qr_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ürün bulunamadı: %', p_qr_code;
  END IF;

  -- Mevcut kullanıcıyı al
  v_user_id := auth.uid();

  -- Stoku güncelle
  v_new_stock := COALESCE(v_product.stock_quantity, 0) + p_quantity;

  UPDATE public.products
  SET stock_quantity = v_new_stock
  WHERE id = v_product.id;

  -- Kayıt oluştur
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
