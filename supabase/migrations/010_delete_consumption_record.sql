-- Admin sarfiyat kaydı silme (stok geri yükleme ile)

CREATE OR REPLACE FUNCTION public.delete_consumption_record(p_record_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.consumption_records%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_new_stock NUMERIC(12, 3);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Giriş yapmanız gerekiyor';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Bu işlem için yönetici yetkisi gerekli';
  END IF;

  SELECT * INTO v_record
  FROM public.consumption_records
  WHERE id = p_record_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sarfiyat kaydı bulunamadı';
  END IF;

  SELECT * INTO v_product
  FROM public.products
  WHERE id = v_record.product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'İlişkili ürün bulunamadı';
  END IF;

  v_new_stock := v_product.stock_quantity + v_record.quantity;

  UPDATE public.products
  SET stock_quantity = v_new_stock
  WHERE id = v_product.id;

  DELETE FROM public.consumption_records
  WHERE id = p_record_id;

  RETURN json_build_object(
    'id', p_record_id,
    'product_name', v_product.name,
    'restored_quantity', v_record.quantity,
    'unit', v_record.unit,
    'new_stock', v_new_stock
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_consumption_record TO authenticated;
