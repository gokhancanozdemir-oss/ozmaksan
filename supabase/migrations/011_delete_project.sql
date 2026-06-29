-- Admin proje silme (bağlı sarfiyat kayıtları + stok geri yükleme)

CREATE OR REPLACE FUNCTION public.delete_project(p_project_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.consumption_records%ROWTYPE;
  v_deleted_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Giriş yapmanız gerekiyor';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Bu işlem için yönetici yetkisi gerekli';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projects WHERE id = p_project_id
  ) THEN
    RAISE EXCEPTION 'Proje bulunamadı';
  END IF;

  FOR v_record IN
    SELECT *
    FROM public.consumption_records
    WHERE project_id = p_project_id
    ORDER BY created_at
    FOR UPDATE
  LOOP
    UPDATE public.products
    SET stock_quantity = stock_quantity + v_record.quantity
    WHERE id = v_record.product_id;

    DELETE FROM public.consumption_records
    WHERE id = v_record.id;

    v_deleted_count := v_deleted_count + 1;
  END LOOP;

  DELETE FROM public.projects
  WHERE id = p_project_id;

  RETURN json_build_object(
    'project_id', p_project_id,
    'deleted_consumption_count', v_deleted_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_project TO authenticated;
