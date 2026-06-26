-- Ürünlerde alt stok uyarı eşiği
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_stock_threshold NUMERIC DEFAULT NULL
  CHECK (min_stock_threshold IS NULL OR min_stock_threshold >= 0);

COMMENT ON COLUMN public.products.min_stock_threshold IS
  'Stok bu değere veya altına düştüğünde yöneticiye uyarı gösterilir; kullanım engellenmez.';
